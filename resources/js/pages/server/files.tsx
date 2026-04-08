import { Head, router } from '@inertiajs/react';
import {
    contents as fileContents,
    destroy,
    show,
    storeDirectory,
    storeFile,
    updateContents,
} from '@/actions/App/Http/Controllers/Client/ServerFilesController';
import InputError from '@/components/input-error';
import Heading from '@/components/heading';
import {
    ConfirmDeleteDialog,
    DataTable,
    type Column,
    type PaginatedData,
} from '@/components/admin/data-table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogContentFull,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/sonner';
import AppLayout from '@/layouts/app-layout';
import { home } from '@/routes';
import { console as serverConsole } from '@/routes/client/servers';
import type { BreadcrumbItem } from '@/types';
import {
    AlertCircle,
    Ellipsis,
    FileText,
    Folder,
    FolderPlus,
    FolderUp,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';

type DirectoryEntry = {
    kind: 'directory' | 'file';
    last_modified_at: number | null;
    name: string;
    path: string;
    permissions: string | null;
    size_bytes: number | null;
};

type DirectoryListing = {
    entries: DirectoryEntry[];
    parent_path: string | null;
    path: string;
};

type Props = {
    directory: DirectoryListing | null;
    directoryError: string | null;
    server: {
        cargo: {
            id: number;
            name: string;
        };
        id: number;
        name: string;
        node: {
            id: number;
            name: string;
        };
        status: string;
    };
};

type FileRow = DirectoryEntry & {
    id: number;
};

type FileEditorState = {
    contents: string;
    last_modified_at: number | null;
    path: string;
    permissions: string | null;
    size_bytes: number;
};

type CreateEntryState = {
    errors: {
        name?: string;
    };
    name: string;
};

const emptyPaginationLinks: PaginatedData<never>['links'] = [];

function csrfToken(): string {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? ''
    );
}

function pathLabel(path: string): string {
    return `/home/container${path ? `/${path}` : ''}`;
}

function pathSegments(path: string): Array<{ label: string; path: string }> {
    if (!path) {
        return [];
    }

    return path.split('/').map((segment, index, segments) => ({
        label: segment,
        path: segments.slice(0, index + 1).join('/'),
    }));
}

function formatBytes(sizeBytes: number | null): string {
    if (sizeBytes === null) {
        return '—';
    }

    if (sizeBytes < 1024) {
        return `${sizeBytes} B`;
    }

    if (sizeBytes < 1024 * 1024) {
        return `${(sizeBytes / 1024).toFixed(sizeBytes >= 10 * 1024 ? 0 : 1).replace(/\.0$/, '')} KiB`;
    }

    return `${(sizeBytes / (1024 * 1024)).toFixed(sizeBytes >= 10 * 1024 * 1024 ? 0 : 1).replace(/\.0$/, '')} MiB`;
}

function formatTimestamp(value: number | null): string {
    if (!value) {
        return 'Unknown';
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value * 1000));
}

function fakePagination<T>(data: T[]): PaginatedData<T> {
    return {
        current_page: 1,
        data,
        from: data.length > 0 ? 1 : null,
        last_page: 1,
        links: emptyPaginationLinks,
        per_page: data.length || 1,
        to: data.length > 0 ? data.length : null,
        total: data.length,
    };
}

function PathBar({
    currentPath,
    onNavigate,
}: {
    currentPath: string;
    onNavigate: (path: string) => void;
}) {
    const segments = pathSegments(currentPath);

    return (
        <div className="rounded-md bg-sidebar p-1">
            <div className="flex flex-wrap items-center gap-1 rounded-md border border-sidebar-accent bg-background px-3 py-2.5 text-sm">
                <button
                    type="button"
                    onClick={() => onNavigate('')}
                    className="rounded px-2 py-1 font-medium text-foreground transition-colors hover:bg-muted"
                >
                    /home/container
                </button>

                {segments.map((segment) => (
                    <div key={segment.path} className="flex items-center gap-1">
                        <span className="text-muted-foreground">/</span>
                        <button
                            type="button"
                            onClick={() => onNavigate(segment.path)}
                            className="rounded px-2 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            {segment.label}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ServerFiles({
    directory,
    directoryError,
    server,
}: Props) {
    const [search, setSearch] = useState('');
    const [openingPath, setOpeningPath] = useState<string | null>(null);
    const [editorState, setEditorState] = useState<FileEditorState | null>(null);
    const [editorValue, setEditorValue] = useState('');
    const [savingFile, setSavingFile] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [deletingPaths, setDeletingPaths] = useState<string[] | null>(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [createFileOpen, setCreateFileOpen] = useState(false);
    const [createDirectoryOpen, setCreateDirectoryOpen] = useState(false);
    const [createFileState, setCreateFileState] = useState<CreateEntryState>({
        errors: {},
        name: '',
    });
    const [createDirectoryState, setCreateDirectoryState] =
        useState<CreateEntryState>({
            errors: {},
            name: '',
        });
    const currentPath = directory?.path ?? '';
    const filteredEntries = useMemo(() => {
        const rows = (directory?.entries ?? []).map((entry, index) => ({
            ...entry,
            id: index + 1,
        }));

        if (!search) {
            return rows;
        }

        const normalizedSearch = search.toLowerCase();

        return rows.filter((entry) =>
            entry.name.toLowerCase().includes(normalizedSearch),
        );
    }, [directory?.entries, search]);
    const fileTable = useMemo(
        () => fakePagination<FileRow>(filteredEntries),
        [filteredEntries],
    );
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: home() },
        { title: server.name, href: serverConsole(server.id) },
        { title: 'Files', href: show(server.id, { query: { path: currentPath || null } }) },
    ];

    const navigateTo = (path: string): void => {
        router.get(
            show.url(server.id),
            path ? { path } : {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const reloadDirectory = (): void => {
        setRefreshing(true);
        router.reload({
            onFinish: () => setRefreshing(false),
            only: ['directory', 'directoryError'],
        });
    };

    const openEntry = async (entry: DirectoryEntry): Promise<void> => {
        if (entry.kind === 'directory') {
            navigateTo(entry.path);
            return;
        }

        setOpeningPath(entry.path);

        try {
            const response = await fetch(
                fileContents.url(server.id, {
                    query: { path: entry.path },
                }),
                {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                },
            );

            const payload = (await response.json().catch(() => null)) as
                | FileEditorState
                | { message?: string }
                | null;

            if (!response.ok) {
                throw new Error(
                    (payload as { message?: string } | null)?.message ||
                        'This file could not be opened.',
                );
            }

            const nextState = payload as FileEditorState;
            setEditorState(nextState);
            setEditorValue(nextState.contents);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'This file could not be opened.',
            );
        } finally {
            setOpeningPath(null);
        }
    };

    const saveFile = async (): Promise<void> => {
        if (!editorState) {
            return;
        }

        setSavingFile(true);

        try {
            const response = await fetch(updateContents.url(server.id), {
                body: JSON.stringify({
                    contents: editorValue,
                    path: editorState.path,
                }),
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                method: 'PUT',
            });
            const payload = (await response.json().catch(() => null)) as
                | { message?: string }
                | null;

            if (!response.ok) {
                throw new Error(
                    payload?.message || 'The file could not be saved.',
                );
            }

            toast.success(payload?.message || 'File saved successfully.');
            setEditorState({ ...editorState, contents: editorValue });
            reloadDirectory();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'The file could not be saved.',
            );
        } finally {
            setSavingFile(false);
        }
    };

    const createEntry = async (
        endpoint: string,
        payload: CreateEntryState,
        reset: () => void,
        close: () => void,
    ): Promise<void> => {
        try {
            const response = await fetch(endpoint, {
                body: JSON.stringify({
                    name: payload.name,
                    path: currentPath,
                }),
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                method: 'POST',
            });
            const json = (await response.json().catch(() => null)) as
                | { errors?: { name?: string[] }; message?: string }
                | null;

            if (!response.ok) {
                const firstError = json?.errors?.name?.[0] ?? json?.message;
                throw new Error(firstError || 'The request could not be completed.');
            }

            toast.success(json?.message || 'Saved.');
            reset();
            close();
            reloadDirectory();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'The request could not be completed.';
            toast.error(message);
        }
    };

    const deleteSelected = async (): Promise<void> => {
        if (!deletingPaths?.length) {
            return;
        }

        setDeleteProcessing(true);

        try {
            const response = await fetch(destroy.url(server.id), {
                body: JSON.stringify({ paths: deletingPaths }),
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                method: 'DELETE',
            });
            const payload = (await response.json().catch(() => null)) as
                | { message?: string }
                | null;

            if (!response.ok) {
                throw new Error(
                    payload?.message || 'The selected items could not be deleted.',
                );
            }

            toast.success(payload?.message || 'Deleted.');
            setDeletingPaths(null);
            reloadDirectory();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'The selected items could not be deleted.',
            );
        } finally {
            setDeleteProcessing(false);
        }
    };

    const columns: Column<FileRow>[] = [
        {
            label: 'Name',
            width: 'w-[42%]',
            render: (entry) => (
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                        {entry.kind === 'directory' ? (
                            <Folder className="size-4 text-muted-foreground" />
                        ) : (
                            <FileText className="size-4 text-muted-foreground" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                            {entry.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {entry.kind === 'directory'
                                ? 'Directory'
                                : entry.path}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            label: 'Size',
            width: 'w-[14%]',
            render: (entry) => (
                <span className="text-sm text-foreground">
                    {entry.kind === 'directory'
                        ? '—'
                        : formatBytes(entry.size_bytes)}
                </span>
            ),
        },
        {
            label: 'Permissions',
            width: 'w-[14%]',
            render: (entry) => (
                <span className="font-mono text-sm text-muted-foreground">
                    {entry.permissions ?? '—'}
                </span>
            ),
        },
        {
            label: 'Last modified',
            width: 'flex-1',
            render: (entry) => (
                <span className="text-xs text-muted-foreground">
                    {formatTimestamp(entry.last_modified_at)}
                </span>
            ),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${server.name} — Files`} />

            <div className="px-4 py-6">
                <Heading
                    title="Files"
                    description="Browse and edit files inside your server container."
                />

                <div className="space-y-6">
                    <PathBar currentPath={currentPath} onNavigate={navigateTo} />

                    {directoryError ? (
                        <Alert className="border-[#d92400]/20 bg-[#d92400]/6">
                            <AlertCircle className="text-[#d92400]" />
                            <AlertTitle>Unable to load this directory</AlertTitle>
                            <AlertDescription>{directoryError}</AlertDescription>
                        </Alert>
                    ) : null}

                    <div className="rounded-md bg-sidebar p-1">
                        <div className="rounded-md border border-sidebar-accent bg-background p-4 sm:p-6">
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-foreground">
                                        {pathLabel(currentPath)}
                                    </h2>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {directory?.entries.length ?? 0} items in this directory.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {directory?.parent_path !== null ? (
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                navigateTo(directory?.parent_path ?? '')
                                            }
                                        >
                                            <FolderUp />
                                            Up
                                        </Button>
                                    ) : null}
                                    <Button
                                        variant="secondary"
                                        onClick={reloadDirectory}
                                        disabled={refreshing}
                                    >
                                        {refreshing ? <Spinner /> : <RefreshCw />}
                                        Refresh
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setCreateDirectoryOpen(true)}
                                    >
                                        <FolderPlus />
                                        New Folder
                                    </Button>
                                    <Button onClick={() => setCreateFileOpen(true)}>
                                        <Plus />
                                        New File
                                    </Button>
                                </div>
                            </div>

                            <DataTable
                                data={fileTable}
                                columns={columns}
                                searchValue={search}
                                onSearch={setSearch}
                                selectable={false}
                                emptyMessage="This directory is empty"
                                emptySearchMessage="Try another file name or clear your search."
                                entityName="item"
                                onRowClick={(entry) => void openEntry(entry)}
                                rowMenu={(entry) => (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <Ellipsis className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => void openEntry(entry)}
                                            >
                                                <Pencil className="size-4" />
                                                {entry.kind === 'directory'
                                                    ? 'Open'
                                                    : 'Edit'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setDeletingPaths([entry.path])
                                                }
                                                variant="destructive"
                                            >
                                                <Trash2 className="size-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={createFileOpen} onOpenChange={setCreateFileOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create File</DialogTitle>
                        <DialogDescription>
                            This file will be created as{' '}
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                                {`${pathLabel(currentPath)}/${createFileState.name || 'new-file.txt'}`}
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-file-name">Name</Label>
                            <Input
                                id="new-file-name"
                                value={createFileState.name}
                                onChange={(event) =>
                                    setCreateFileState((current) => ({
                                        ...current,
                                        errors: {},
                                        name: event.target.value,
                                    }))
                                }
                                placeholder="server.properties"
                            />
                            <InputError message={createFileState.errors.name} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setCreateFileOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() =>
                                    void createEntry(
                                        storeFile.url(server.id),
                                        createFileState,
                                        () =>
                                            setCreateFileState({
                                                errors: {},
                                                name: '',
                                            }),
                                        () => setCreateFileOpen(false),
                                    )
                                }
                            >
                                Create File
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={createDirectoryOpen}
                onOpenChange={setCreateDirectoryOpen}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create Directory</DialogTitle>
                        <DialogDescription>
                            This directory will be created as{' '}
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                                {`${pathLabel(currentPath)}/${createDirectoryState.name || 'new-folder'}`}
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-directory-name">Name</Label>
                            <Input
                                id="new-directory-name"
                                value={createDirectoryState.name}
                                onChange={(event) =>
                                    setCreateDirectoryState((current) => ({
                                        ...current,
                                        errors: {},
                                        name: event.target.value,
                                    }))
                                }
                                placeholder="plugins"
                            />
                            <InputError
                                message={createDirectoryState.errors.name}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setCreateDirectoryOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() =>
                                    void createEntry(
                                        storeDirectory.url(server.id),
                                        createDirectoryState,
                                        () =>
                                            setCreateDirectoryState({
                                                errors: {},
                                                name: '',
                                            }),
                                        () => setCreateDirectoryOpen(false),
                                    )
                                }
                            >
                                Create Directory
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={editorState !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditorState(null);
                        setEditorValue('');
                    }
                }}
            >
                <DialogContentFull>
                    <div className="flex items-center justify-between border-b border-border/70 px-8 py-5">
                        <div>
                            <DialogTitle className="text-lg">Edit File</DialogTitle>
                            <DialogDescription>
                                {editorState ? pathLabel(editorState.path) : 'Loading...'}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {editorState?.permissions ? (
                                <span className="rounded bg-muted px-2 py-1 font-mono">
                                    {editorState.permissions}
                                </span>
                            ) : null}
                            {editorState ? (
                                <span>{formatBytes(editorState.size_bytes)}</span>
                            ) : null}
                        </div>
                    </div>
                    <div className="px-8 py-6">
                        <textarea
                            value={editorValue}
                            onChange={(event) => setEditorValue(event.target.value)}
                            className="min-h-[60vh] w-full rounded-lg border border-input bg-background px-4 py-3 font-mono text-sm text-foreground outline-hidden ring-offset-background placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                            spellCheck={false}
                        />
                    </div>
                    <div className="flex items-center justify-between border-t border-border/70 px-8 py-5">
                        <p className="text-sm text-muted-foreground">
                            Save changes to write this file back into the server volume.
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setEditorState(null);
                                    setEditorValue('');
                                }}
                            >
                                Close
                            </Button>
                            <Button
                                onClick={() => void saveFile()}
                                disabled={savingFile || editorState === null}
                            >
                                {savingFile && <Spinner />}
                                Save Content
                            </Button>
                        </div>
                    </div>
                </DialogContentFull>
            </Dialog>

            <ConfirmDeleteDialog
                open={deletingPaths !== null}
                onOpenChange={(open) => !open && setDeletingPaths(null)}
                title="Delete files"
                description="This action cannot be undone. The selected files or directories will be removed permanently."
                loading={deleteProcessing}
                onConfirm={() => void deleteSelected()}
            />

            {openingPath ? (
                <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm">
                    <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/95 px-4 py-3 shadow-sm">
                        <Spinner />
                        <span className="text-sm text-muted-foreground">
                            Opening {openingPath}...
                        </span>
                    </div>
                </div>
            ) : null}
        </AppLayout>
    );
}
