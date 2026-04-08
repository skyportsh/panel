import { Head, router } from '@inertiajs/react';
import {
    archive,
    contents as fileContents,
    copy,
    destroy,
    extract,
    move,
    rename,
    show,
    storeDirectory,
    storeFile,
    updateContents,
    updatePermissions,
    upload,
} from '@/actions/App/Http/Controllers/Client/ServerFilesController';
import {
    ConfirmDeleteDialog,
    DataTable,
    type Column,
    type PaginatedData,
} from '@/components/admin/data-table';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
    DropdownMenuSeparator,
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
    Archive,
    Copy,
    Ellipsis,
    FileText,
    Folder,
    FolderPlus,
    FolderUp,
    MoveRight,
    Pencil,
    Plus,
    RefreshCw,
    Shield,
    Trash2,
    Upload,
    WandSparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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

type RenameState = {
    name: string;
    path: string;
} | null;

type TransferMode = 'copy' | 'move';

type TransferState = {
    destination: string;
    mode: TransferMode;
    paths: string[];
} | null;

type PermissionsState = {
    paths: string[];
    permissions: string;
} | null;

type ArchiveState = {
    name: string;
    path: string;
    paths: string[];
} | null;

type ExtractState = {
    destination: string;
    path: string;
} | null;

type MutationErrorPayload = {
    errors?: Record<string, string[]>;
    message?: string;
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

function baseName(path: string): string {
    return path.split('/').filter(Boolean).pop() ?? path;
}

function defaultArchiveName(paths: string[]): string {
    if (paths.length === 1) {
        const name = baseName(paths[0]);
        return `${name}.zip`;
    }

    return 'archive.zip';
}

function isArchive(entry: DirectoryEntry): boolean {
    return entry.kind === 'file' && entry.name.toLowerCase().endsWith('.zip');
}

function formatBytes(sizeBytes: number | null): string {
    if (sizeBytes === null) {
        return '—';
    }

    if (sizeBytes < 1024) {
        return `${sizeBytes} B`;
    }

    if (sizeBytes < 1024 * 1024) {
        return `${(sizeBytes / 1024)
            .toFixed(sizeBytes >= 10 * 1024 ? 0 : 1)
            .replace(/\.0$/, '')} KiB`;
    }

    return `${(sizeBytes / (1024 * 1024))
        .toFixed(sizeBytes >= 10 * 1024 * 1024 ? 0 : 1)
        .replace(/\.0$/, '')} MiB`;
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

async function parseJson<T>(response: Response): Promise<T | null> {
    return (await response.json().catch(() => null)) as T | null;
}

export default function ServerFiles({
    directory,
    directoryError,
    server,
}: Props) {
    const uploadInputRef = useRef<HTMLInputElement | null>(null);
    const [search, setSearch] = useState('');
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
    const [openingPath, setOpeningPath] = useState<string | null>(null);
    const [editorState, setEditorState] = useState<FileEditorState | null>(null);
    const [editorValue, setEditorValue] = useState('');
    const [savingFile, setSavingFile] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pendingDeletePaths, setPendingDeletePaths] = useState<string[] | null>(
        null,
    );
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
    const [renameState, setRenameState] = useState<RenameState>(null);
    const [renameError, setRenameError] = useState<string | null>(null);
    const [transferState, setTransferState] = useState<TransferState>(null);
    const [transferError, setTransferError] = useState<string | null>(null);
    const [permissionsState, setPermissionsState] =
        useState<PermissionsState>(null);
    const [permissionsError, setPermissionsError] = useState<string | null>(null);
    const [archiveState, setArchiveState] = useState<ArchiveState>(null);
    const [archiveError, setArchiveError] = useState<string | null>(null);
    const [extractState, setExtractState] = useState<ExtractState>(null);
    const [extractError, setExtractError] = useState<string | null>(null);
    const [mutationProcessing, setMutationProcessing] = useState(false);
    const [uploadingNames, setUploadingNames] = useState<string[]>([]);
    const currentPath = directory?.path ?? '';
    const parentPath = directory?.parent_path ?? null;
    const selectedPathList = useMemo(
        () => Array.from(selectedPaths),
        [selectedPaths],
    );
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
        {
            title: 'Files',
            href: show(server.id, { query: { path: currentPath || null } }),
        },
    ];

    useEffect(() => {
        setSelectedPaths(new Set());
    }, [directory?.entries, directory?.path]);

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

    const clearSelection = (): void => {
        setSelectedPaths(new Set());
    };

    const togglePathSelection = (path: string): void => {
        setSelectedPaths((current) => {
            const next = new Set(current);

            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }

            return next;
        });
    };

    const mutationHeaders = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken(),
        'X-Requested-With': 'XMLHttpRequest',
    };

    const requestMutation = async (
        url: string,
        method: 'DELETE' | 'PATCH' | 'POST' | 'PUT',
        payload: FormData | Record<string, unknown>,
    ): Promise<{ message?: string }> => {
        const response = await fetch(url, {
            body:
                payload instanceof FormData
                    ? payload
                    : JSON.stringify(payload),
            headers:
                payload instanceof FormData
                    ? {
                          Accept: 'application/json',
                          'X-CSRF-TOKEN': csrfToken(),
                          'X-Requested-With': 'XMLHttpRequest',
                      }
                    : mutationHeaders,
            method,
        });
        const json = await parseJson<MutationErrorPayload>(response);

        if (!response.ok) {
            throw new Error(
                json?.errors
                    ? Object.values(json.errors)[0]?.[0] ||
                          json.message ||
                          'The request could not be completed.'
                    : json?.message || 'The request could not be completed.',
            );
        }

        return json ?? {};
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
            const payload = await parseJson<
                FileEditorState | { message?: string }
            >(response);

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
            const payload = await requestMutation(
                updateContents.url(server.id),
                'PUT',
                {
                    contents: editorValue,
                    path: editorState.path,
                },
            );

            toast.success(payload.message || 'File saved successfully.');
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
        state: CreateEntryState,
        setState: React.Dispatch<React.SetStateAction<CreateEntryState>>,
        close: () => void,
    ): Promise<void> => {
        try {
            const payload = await requestMutation(endpoint, 'POST', {
                name: state.name,
                path: currentPath,
            });

            toast.success(payload.message || 'Saved.');
            setState({ errors: {}, name: '' });
            close();
            reloadDirectory();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'The request could not be completed.';
            setState((current) => ({
                ...current,
                errors: { name: message },
            }));
        }
    };

    const deleteSelected = async (): Promise<void> => {
        if (!pendingDeletePaths?.length) {
            return;
        }

        setDeleteProcessing(true);

        try {
            const payload = await requestMutation(destroy.url(server.id), 'DELETE', {
                paths: pendingDeletePaths,
            });

            toast.success(payload.message || 'Deleted.');
            setPendingDeletePaths(null);
            clearSelection();
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

    const submitRename = async (): Promise<void> => {
        if (!renameState) {
            return;
        }

        setMutationProcessing(true);
        setRenameError(null);

        try {
            const payload = await requestMutation(rename.url(server.id), 'PATCH', {
                name: renameState.name,
                path: renameState.path,
            });

            toast.success(payload.message || 'Item renamed successfully.');
            setRenameState(null);
            clearSelection();
            reloadDirectory();
        } catch (error) {
            setRenameError(
                error instanceof Error
                    ? error.message
                    : 'The item could not be renamed.',
            );
        } finally {
            setMutationProcessing(false);
        }
    };

    const submitTransfer = async (): Promise<void> => {
        if (!transferState) {
            return;
        }

        setMutationProcessing(true);
        setTransferError(null);

        try {
            const endpoint =
                transferState.mode === 'copy' ? copy.url(server.id) : move.url(server.id);
            const payload = await requestMutation(endpoint, 'POST', {
                destination: transferState.destination,
                paths: transferState.paths,
            });

            toast.success(
                payload.message ||
                    (transferState.mode === 'copy'
                        ? 'Items copied successfully.'
                        : 'Items moved successfully.'),
            );
            setTransferState(null);
            clearSelection();
            reloadDirectory();
        } catch (error) {
            setTransferError(
                error instanceof Error
                    ? error.message
                    : 'The transfer could not be completed.',
            );
        } finally {
            setMutationProcessing(false);
        }
    };

    const submitPermissions = async (): Promise<void> => {
        if (!permissionsState) {
            return;
        }

        setMutationProcessing(true);
        setPermissionsError(null);

        try {
            const payload = await requestMutation(
                updatePermissions.url(server.id),
                'PATCH',
                {
                    paths: permissionsState.paths,
                    permissions: permissionsState.permissions,
                },
            );

            toast.success(payload.message || 'Permissions updated successfully.');
            setPermissionsState(null);
            clearSelection();
            reloadDirectory();
        } catch (error) {
            setPermissionsError(
                error instanceof Error
                    ? error.message
                    : 'Permissions could not be updated.',
            );
        } finally {
            setMutationProcessing(false);
        }
    };

    const submitArchive = async (): Promise<void> => {
        if (!archiveState) {
            return;
        }

        setMutationProcessing(true);
        setArchiveError(null);

        try {
            const payload = await requestMutation(archive.url(server.id), 'POST', {
                name: archiveState.name,
                path: archiveState.path,
                paths: archiveState.paths,
            });

            toast.success(payload.message || 'Archive created successfully.');
            setArchiveState(null);
            clearSelection();
            reloadDirectory();
        } catch (error) {
            setArchiveError(
                error instanceof Error
                    ? error.message
                    : 'The archive could not be created.',
            );
        } finally {
            setMutationProcessing(false);
        }
    };

    const submitExtract = async (): Promise<void> => {
        if (!extractState) {
            return;
        }

        setMutationProcessing(true);
        setExtractError(null);

        try {
            const payload = await requestMutation(extract.url(server.id), 'POST', {
                destination: extractState.destination,
                path: extractState.path,
            });

            toast.success(payload.message || 'Archive extracted successfully.');
            setExtractState(null);
            clearSelection();
            reloadDirectory();
        } catch (error) {
            setExtractError(
                error instanceof Error
                    ? error.message
                    : 'The archive could not be extracted.',
            );
        } finally {
            setMutationProcessing(false);
        }
    };

    const uploadFiles = async (files: FileList | null): Promise<void> => {
        if (!files?.length) {
            return;
        }

        const names = Array.from(files).map((file) => file.name);
        setUploadingNames(names);

        try {
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append('path', currentPath);
                formData.append('file', file);

                const payload = await requestMutation(
                    upload.url(server.id),
                    'POST',
                    formData,
                );

                toast.success(payload.message || `${file.name} uploaded successfully.`);
            }

            reloadDirectory();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'One or more files could not be uploaded.',
            );
        } finally {
            setUploadingNames([]);
            if (uploadInputRef.current) {
                uploadInputRef.current.value = '';
            }
        }
    };

    const columns: Column<FileRow>[] = [
        {
            label: 'Name',
            width: 'w-[42%]',
            render: (entry) => (
                <div className="flex min-w-0 items-center gap-3">
                    <div
                        className="flex shrink-0 items-center"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <Checkbox
                            checked={selectedPaths.has(entry.path)}
                            onCheckedChange={() => togglePathSelection(entry.path)}
                            aria-label={`Select ${entry.name}`}
                        />
                    </div>
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
                            {entry.kind === 'directory' ? 'Directory' : entry.path}
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
                    {entry.kind === 'directory' ? '—' : formatBytes(entry.size_bytes)}
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
                    description="Manage files, folders, uploads, archives, and permissions inside your server container."
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
                                    {parentPath !== null ? (
                                        <Button
                                            variant="secondary"
                                            onClick={() => navigateTo(parentPath)}
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
                                        onClick={() => uploadInputRef.current?.click()}
                                        disabled={uploadingNames.length > 0}
                                    >
                                        {uploadingNames.length > 0 ? <Spinner /> : <Upload />}
                                        Upload
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

                            {selectedPathList.length > 0 ? (
                                <div className="mb-4 flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {selectedPathList.length} item{selectedPathList.length === 1 ? '' : 's'} selected
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Move, copy, archive, change permissions, or delete multiple items at once.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                setTransferState({
                                                    destination: currentPath,
                                                    mode: 'copy',
                                                    paths: selectedPathList,
                                                })
                                            }
                                        >
                                            <Copy />
                                            Copy
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                setTransferState({
                                                    destination: currentPath,
                                                    mode: 'move',
                                                    paths: selectedPathList,
                                                })
                                            }
                                        >
                                            <MoveRight />
                                            Move
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                setPermissionsState({
                                                    paths: selectedPathList,
                                                    permissions:
                                                        directory?.entries.find((entry) =>
                                                            entry.path ===
                                                            selectedPathList[0],
                                                        )?.permissions ?? '644',
                                                })
                                            }
                                        >
                                            <Shield />
                                            Permissions
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                setArchiveState({
                                                    name: defaultArchiveName(
                                                        selectedPathList,
                                                    ),
                                                    path: currentPath,
                                                    paths: selectedPathList,
                                                })
                                            }
                                        >
                                            <Archive />
                                            Archive
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() =>
                                                setPendingDeletePaths(selectedPathList)
                                            }
                                        >
                                            <Trash2 />
                                            Delete
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={clearSelection}
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                            ) : null}

                            {uploadingNames.length > 0 ? (
                                <div className="mb-4 flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
                                    <Spinner />
                                    Uploading {uploadingNames.join(', ')}...
                                </div>
                            ) : null}

                            <input
                                ref={uploadInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(event) =>
                                    void uploadFiles(event.target.files)
                                }
                            />

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
                                                    setRenameState({
                                                        name: entry.name,
                                                        path: entry.path,
                                                    })
                                                }
                                            >
                                                <Pencil className="size-4" />
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setTransferState({
                                                        destination: currentPath,
                                                        mode: 'copy',
                                                        paths: [entry.path],
                                                    })
                                                }
                                            >
                                                <Copy className="size-4" />
                                                Copy to...
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setTransferState({
                                                        destination: currentPath,
                                                        mode: 'move',
                                                        paths: [entry.path],
                                                    })
                                                }
                                            >
                                                <MoveRight className="size-4" />
                                                Move to...
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setPermissionsState({
                                                        paths: [entry.path],
                                                        permissions:
                                                            entry.permissions ?? '644',
                                                    })
                                                }
                                            >
                                                <Shield className="size-4" />
                                                Permissions
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setArchiveState({
                                                        name: `${entry.name}.zip`,
                                                        path: currentPath,
                                                        paths: [entry.path],
                                                    })
                                                }
                                            >
                                                <Archive className="size-4" />
                                                Archive
                                            </DropdownMenuItem>
                                            {isArchive(entry) ? (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            setExtractState({
                                                                destination:
                                                                    currentPath,
                                                                path: entry.path,
                                                            })
                                                        }
                                                    >
                                                        <WandSparkles className="size-4" />
                                                        Extract here
                                                    </DropdownMenuItem>
                                                </>
                                            ) : null}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setPendingDeletePaths([entry.path])
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
                                    setCreateFileState({
                                        errors: {},
                                        name: event.target.value,
                                    })
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
                                        setCreateFileState,
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
                                    setCreateDirectoryState({
                                        errors: {},
                                        name: event.target.value,
                                    })
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
                                        setCreateDirectoryState,
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
                open={renameState !== null}
                onOpenChange={(open) => !open && setRenameState(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Rename Item</DialogTitle>
                        <DialogDescription>
                            Update the file or directory name without moving it.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="rename-name">New name</Label>
                            <Input
                                id="rename-name"
                                value={renameState?.name ?? ''}
                                onChange={(event) => {
                                    setRenameError(null);
                                    setRenameState((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  name: event.target.value,
                                              }
                                            : current,
                                    );
                                }}
                            />
                            <InputError message={renameError ?? undefined} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setRenameState(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => void submitRename()}
                                disabled={mutationProcessing || renameState === null}
                            >
                                {mutationProcessing && <Spinner />}
                                Rename
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={transferState !== null}
                onOpenChange={(open) => !open && setTransferState(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {transferState?.mode === 'copy' ? 'Copy Items' : 'Move Items'}
                        </DialogTitle>
                        <DialogDescription>
                            Enter the destination directory relative to{' '}
                            <span className="font-mono text-xs text-foreground">
                                /home/container
                            </span>
                            . Leave it empty to use the server root.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="transfer-destination">
                                Destination directory
                            </Label>
                            <Input
                                id="transfer-destination"
                                value={transferState?.destination ?? ''}
                                onChange={(event) => {
                                    setTransferError(null);
                                    setTransferState((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  destination:
                                                      event.target.value,
                                              }
                                            : current,
                                    );
                                }}
                                placeholder="plugins"
                            />
                            <InputError message={transferError ?? undefined} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setTransferState(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => void submitTransfer()}
                                disabled={mutationProcessing || transferState === null}
                            >
                                {mutationProcessing && <Spinner />}
                                {transferState?.mode === 'copy' ? 'Copy' : 'Move'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={permissionsState !== null}
                onOpenChange={(open) => !open && setPermissionsState(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Change Permissions</DialogTitle>
                        <DialogDescription>
                            Enter a mode such as 644 or 755.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="permissions-mode">Mode</Label>
                            <Input
                                id="permissions-mode"
                                value={permissionsState?.permissions ?? ''}
                                onChange={(event) => {
                                    setPermissionsError(null);
                                    setPermissionsState((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  permissions:
                                                      event.target.value,
                                              }
                                            : current,
                                    );
                                }}
                                placeholder="644"
                            />
                            <InputError message={permissionsError ?? undefined} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setPermissionsState(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => void submitPermissions()}
                                disabled={
                                    mutationProcessing ||
                                    permissionsState === null
                                }
                            >
                                {mutationProcessing && <Spinner />}
                                Save Permissions
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={archiveState !== null}
                onOpenChange={(open) => !open && setArchiveState(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create Archive</DialogTitle>
                        <DialogDescription>
                            Bundle the selected items into a zip archive.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="archive-name">Archive name</Label>
                            <Input
                                id="archive-name"
                                value={archiveState?.name ?? ''}
                                onChange={(event) => {
                                    setArchiveError(null);
                                    setArchiveState((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  name: event.target.value,
                                              }
                                            : current,
                                    );
                                }}
                                placeholder="archive.zip"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="archive-path">Save to directory</Label>
                            <Input
                                id="archive-path"
                                value={archiveState?.path ?? ''}
                                onChange={(event) => {
                                    setArchiveError(null);
                                    setArchiveState((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  path: event.target.value,
                                              }
                                            : current,
                                    );
                                }}
                                placeholder="plugins"
                            />
                            <InputError message={archiveError ?? undefined} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setArchiveState(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => void submitArchive()}
                                disabled={mutationProcessing || archiveState === null}
                            >
                                {mutationProcessing && <Spinner />}
                                Create Archive
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={extractState !== null}
                onOpenChange={(open) => !open && setExtractState(null)}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Extract Archive</DialogTitle>
                        <DialogDescription>
                            Choose where this archive should be extracted. Leave it
                            empty to extract into the server root.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="extract-destination">
                                Destination directory
                            </Label>
                            <Input
                                id="extract-destination"
                                value={extractState?.destination ?? ''}
                                onChange={(event) => {
                                    setExtractError(null);
                                    setExtractState((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  destination:
                                                      event.target.value,
                                              }
                                            : current,
                                    );
                                }}
                                placeholder="plugins"
                            />
                            <InputError message={extractError ?? undefined} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="secondary"
                                onClick={() => setExtractState(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => void submitExtract()}
                                disabled={mutationProcessing || extractState === null}
                            >
                                {mutationProcessing && <Spinner />}
                                Extract Archive
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
                open={pendingDeletePaths !== null}
                onOpenChange={(open) => !open && setPendingDeletePaths(null)}
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
