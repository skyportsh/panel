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
import CodeEditor from '@/components/server/code-editor';
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/sonner';
import AppLayout from '@/layouts/app-layout';
import { detectEditorLanguage } from '@/lib/file-editor-language';
import { home } from '@/routes';
import { console as serverConsole } from '@/routes/client/servers';
import type { BreadcrumbItem } from '@/types';
import {
    AlertCircle,
    Archive,
    Binary,
    Braces,
    CheckCircle2,
    Copy as CopyIcon,
    Ellipsis,
    FileArchive,
    FileAudio2,
    FileCode2,
    FileCog,
    FileImage,
    FileJson2,
    FileSpreadsheet,
    FileText,
    FileVideo2,
    Folder,
    FolderPlus,
    FolderUp,
    MoveRight,
    Pencil,
    Plus,
    RefreshCw,
    ScrollText,
    Shield,
    Terminal,
    Trash2,
    Upload,
    WandSparkles,
    XCircle,
} from 'lucide-react';
import {
    type Dispatch,
    type SetStateAction,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

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
    destination: string;
    name: string;
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

type UploadItemState = {
    name: string;
    progress: number;
    size: number;
    status: 'complete' | 'error' | 'pending' | 'uploading';
    error?: string;
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

        return name.toLowerCase().endsWith('.zip') ? name : `${name}.zip`;
    }

    return 'archive.zip';
}

function isArchive(entry: DirectoryEntry): boolean {
    return entry.kind === 'file' && entry.name.toLowerCase().endsWith('.zip');
}

function fileVisual(entry: DirectoryEntry): {
    icon: typeof Folder;
    iconClassName: string;
    label: string;
    wrapperClassName: string;
} {
    if (entry.kind === 'directory') {
        return {
            icon: Folder,
            iconClassName: 'text-[#d92400] dark:text-[#ff5a36]',
            label: 'Directory',
            wrapperClassName: 'bg-[#d92400]/10 dark:bg-[#ff5a36]/10',
        };
    }

    const lowerName = entry.name.toLowerCase();

    if (lowerName.endsWith('.zip')) {
        return {
            icon: FileArchive,
            iconClassName: 'text-orange-600 dark:text-orange-400',
            label: 'Archive',
            wrapperClassName: 'bg-orange-500/10',
        };
    }

    if (lowerName.endsWith('.json')) {
        return {
            icon: FileJson2,
            iconClassName: 'text-lime-600 dark:text-lime-400',
            label: 'JSON file',
            wrapperClassName: 'bg-lime-500/10',
        };
    }

    if (
        lowerName.endsWith('.js') ||
        lowerName.endsWith('.ts') ||
        lowerName.endsWith('.tsx') ||
        lowerName.endsWith('.jsx') ||
        lowerName.endsWith('.php') ||
        lowerName.endsWith('.rs') ||
        lowerName.endsWith('.py') ||
        lowerName.endsWith('.go') ||
        lowerName.endsWith('.java') ||
        lowerName.endsWith('.c') ||
        lowerName.endsWith('.cpp')
    ) {
        return {
            icon: FileCode2,
            iconClassName: 'text-sky-600 dark:text-sky-400',
            label: 'Code file',
            wrapperClassName: 'bg-sky-500/10',
        };
    }

    if (
        lowerName.endsWith('.yml') ||
        lowerName.endsWith('.yaml') ||
        lowerName.endsWith('.toml') ||
        lowerName.endsWith('.ini') ||
        lowerName.endsWith('.conf') ||
        lowerName.endsWith('.properties')
    ) {
        return {
            icon: FileCog,
            iconClassName: 'text-violet-600 dark:text-violet-400',
            label: 'Config file',
            wrapperClassName: 'bg-violet-500/10',
        };
    }

    if (
        lowerName.endsWith('.sh') ||
        lowerName.endsWith('.bash') ||
        lowerName.endsWith('.zsh') ||
        lowerName === 'dockerfile' ||
        lowerName === '.env' ||
        lowerName.startsWith('.env.')
    ) {
        return {
            icon: Terminal,
            iconClassName: 'text-emerald-600 dark:text-emerald-400',
            label: 'Shell file',
            wrapperClassName: 'bg-emerald-500/10',
        };
    }

    if (
        lowerName.endsWith('.png') ||
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.gif') ||
        lowerName.endsWith('.webp') ||
        lowerName.endsWith('.svg')
    ) {
        return {
            icon: FileImage,
            iconClassName: 'text-pink-600 dark:text-pink-400',
            label: 'Image file',
            wrapperClassName: 'bg-pink-500/10',
        };
    }

    if (
        lowerName.endsWith('.mp4') ||
        lowerName.endsWith('.mov') ||
        lowerName.endsWith('.webm') ||
        lowerName.endsWith('.mkv')
    ) {
        return {
            icon: FileVideo2,
            iconClassName: 'text-fuchsia-600 dark:text-fuchsia-400',
            label: 'Video file',
            wrapperClassName: 'bg-fuchsia-500/10',
        };
    }

    if (
        lowerName.endsWith('.mp3') ||
        lowerName.endsWith('.ogg') ||
        lowerName.endsWith('.wav') ||
        lowerName.endsWith('.flac')
    ) {
        return {
            icon: FileAudio2,
            iconClassName: 'text-cyan-600 dark:text-cyan-400',
            label: 'Audio file',
            wrapperClassName: 'bg-cyan-500/10',
        };
    }

    if (
        lowerName.endsWith('.csv') ||
        lowerName.endsWith('.xls') ||
        lowerName.endsWith('.xlsx')
    ) {
        return {
            icon: FileSpreadsheet,
            iconClassName: 'text-green-600 dark:text-green-400',
            label: 'Spreadsheet',
            wrapperClassName: 'bg-green-500/10',
        };
    }

    if (
        lowerName.endsWith('.md') ||
        lowerName.endsWith('.txt') ||
        lowerName.endsWith('.log')
    ) {
        return {
            icon: ScrollText,
            iconClassName: 'text-stone-600 dark:text-stone-400',
            label: 'Text file',
            wrapperClassName: 'bg-stone-500/10',
        };
    }

    if (lowerName.endsWith('.nbt') || lowerName.endsWith('.dat')) {
        return {
            icon: Binary,
            iconClassName: 'text-indigo-600 dark:text-indigo-400',
            label: 'Binary file',
            wrapperClassName: 'bg-indigo-500/10',
        };
    }

    if (lowerName.endsWith('.xml')) {
        return {
            icon: Braces,
            iconClassName: 'text-rose-600 dark:text-rose-400',
            label: 'XML file',
            wrapperClassName: 'bg-rose-500/10',
        };
    }

    return {
        icon: FileText,
        iconClassName: 'text-muted-foreground',
        label: 'File',
        wrapperClassName: 'bg-muted/60',
    };
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

function overallUploadProgress(items: UploadItemState[]): number {
    if (items.length === 0) {
        return 0;
    }

    const total = items.reduce((sum, item) => sum + item.progress, 0);

    return Math.round(total / items.length);
}

async function parseJson<T>(response: Response): Promise<T | null> {
    return (await response.json().catch(() => null)) as T | null;
}

function InlinePathSummary({
    currentPath,
    onNavigate,
}: {
    currentPath: string;
    onNavigate: (path: string) => void;
}) {
    const segments = pathSegments(currentPath);

    return (
        <div className="-ml-2 flex flex-wrap items-center gap-1 text-sm font-medium text-foreground">
            <button
                type="button"
                onClick={() => onNavigate('')}
                className="rounded px-1.5 py-0.5 pl-2 transition-colors hover:bg-muted"
            >
                /home/container
            </button>
            {segments.map((segment) => (
                <div key={segment.path} className="flex items-center gap-1">
                    <span className="text-muted-foreground">/</span>
                    <button
                        type="button"
                        onClick={() => onNavigate(segment.path)}
                        className="rounded px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        {segment.label}
                    </button>
                </div>
            ))}
        </div>
    );
}

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds);
    });
}

async function withMinimumDuration<T>(
    operation: Promise<T>,
    milliseconds = 300,
): Promise<T> {
    const startedAt = Date.now();
    const result = await operation;
    const remaining = milliseconds - (Date.now() - startedAt);

    if (remaining > 0) {
        await delay(remaining);
    }

    return result;
}

function FilesBulkActionBar({
    count,
    onArchive,
    onCancel,
    onCopy,
    onDelete,
    onMove,
    onPermissions,
}: {
    count: number;
    onArchive: () => void;
    onCancel: () => void;
    onCopy: () => void;
    onDelete: () => void;
    onMove: () => void;
    onPermissions: () => void;
}) {
    return (
        <>
            <div
                aria-hidden="true"
                className={
                    count > 0
                        ? 'pointer-events-none fixed inset-x-0 -bottom-4 z-40 h-52 translate-y-0 opacity-100 transition-all duration-300 ease-out'
                        : 'pointer-events-none fixed inset-x-0 -bottom-4 z-40 h-52 translate-y-full opacity-0 transition-all duration-300 ease-out'
                }
            >
                <div className="absolute inset-x-0 bottom-0 h-1/4 backdrop-blur-md" />
                <div className="absolute inset-x-0 bottom-0 h-2/4 backdrop-blur-sm" />
                <div className="absolute inset-x-0 bottom-0 h-3/4 backdrop-blur-[2px]" />
                <div className="absolute inset-x-0 bottom-0 h-full backdrop-blur-[1px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>

            <div
                className={
                    count > 0
                        ? 'fixed inset-x-0 bottom-0 z-50 flex translate-y-0 justify-center opacity-100 transition-all duration-300 ease-out'
                        : 'pointer-events-none fixed inset-x-0 bottom-0 z-50 flex translate-y-full justify-center opacity-0 transition-all duration-300 ease-out'
                }
            >
                <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur">
                    <span className="text-xs font-medium text-muted-foreground">
                        {count} item{count === 1 ? '' : 's'} selected
                    </span>
                    <div className="h-4 w-px bg-border" />
                    <Button size="table" variant="secondary" onClick={onCopy}>
                        <CopyIcon className="h-3.5 w-3.5" />
                        Copy
                    </Button>
                    <Button size="table" variant="secondary" onClick={onMove}>
                        <MoveRight className="h-3.5 w-3.5" />
                        Move
                    </Button>
                    <Button
                        size="table"
                        variant="secondary"
                        onClick={onPermissions}
                    >
                        <Shield className="h-3.5 w-3.5" />
                        Permissions
                    </Button>
                    <Button
                        size="table"
                        variant="secondary"
                        onClick={onArchive}
                    >
                        <Archive className="h-3.5 w-3.5" />
                        Archive
                    </Button>
                    <Button size="table" variant="destructive" onClick={onDelete}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                    </Button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </>
    );
}

function UploadProgressCard({ items }: { items: UploadItemState[] }) {
    if (items.length === 0) {
        return null;
    }

    const progress = overallUploadProgress(items);
    const completedCount = items.filter(
        (item) => item.status === 'complete',
    ).length;
    const hasFailures = items.some((item) => item.status === 'error');

    return (
        <div className="mb-5 overflow-hidden rounded-lg bg-muted/40">
            <div className="px-4 py-2.5">
                <span className="text-xs font-medium text-muted-foreground">
                    Upload queue
                </span>
            </div>
            <div className="rounded-lg border border-border/70 bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-foreground">
                            {hasFailures
                                ? 'Uploads finished with errors'
                                : completedCount === items.length
                                  ? 'Uploads complete'
                                  : 'Uploading files...'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {completedCount} of {items.length} complete · {progress}% overall
                        </p>
                    </div>
                    <div className="w-full max-w-xs">
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-[#d92400] transition-all duration-200"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    {items.map((item) => (
                        <div
                            key={item.name}
                            className="rounded-md border border-border/70 px-3 py-2"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">
                                        {item.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatBytes(item.size)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    {item.status === 'uploading' ? <Spinner /> : null}
                                    {item.status === 'complete' ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    ) : null}
                                    {item.status === 'error' ? (
                                        <XCircle className="h-4 w-4 text-destructive" />
                                    ) : null}
                                    <span>{item.progress}%</span>
                                </div>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                    className={
                                        item.status === 'error'
                                            ? 'h-full rounded-full bg-destructive transition-all duration-200'
                                            : 'h-full rounded-full bg-[#d92400] transition-all duration-200'
                                    }
                                    style={{ width: `${item.progress}%` }}
                                />
                            </div>
                            {item.error ? (
                                <p className="mt-2 text-xs text-destructive">
                                    {item.error}
                                </p>
                            ) : null}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

async function uploadWithProgress(
    url: string,
    formData: FormData,
    onProgress: (progress: number) => void,
): Promise<MutationErrorPayload> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', url, true);
        request.responseType = 'json';
        request.setRequestHeader('Accept', 'application/json');
        request.setRequestHeader('X-CSRF-TOKEN', csrfToken());
        request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        request.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                onProgress(Math.max(1, Math.round((event.loaded / event.total) * 100)));
            }
        };

        request.onerror = () => {
            reject(new Error('The file could not be uploaded.'));
        };

        request.onload = () => {
            const payload = (request.response ?? null) as MutationErrorPayload | null;

            if (request.status >= 200 && request.status < 300) {
                onProgress(100);
                resolve(payload ?? {});

                return;
            }

            reject(
                new Error(
                    payload?.errors
                        ? Object.values(payload.errors)[0]?.[0] ??
                              payload.message ??
                              'The file could not be uploaded.'
                        : payload?.message ?? 'The file could not be uploaded.',
                ),
            );
        };

        request.send(formData);
    });
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
    const [uploadItems, setUploadItems] = useState<UploadItemState[]>([]);
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
    const selectedRowIds = useMemo(
        () =>
            new Set(
                filteredEntries
                    .filter((entry) => selectedPaths.has(entry.path))
                    .map((entry) => entry.id),
            ),
        [filteredEntries, selectedPaths],
    );
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
        payload: Record<string, unknown>,
    ): Promise<MutationErrorPayload> => {
        const response = await fetch(url, {
            body: JSON.stringify(payload),
            headers: mutationHeaders,
            method,
        });
        const json = await parseJson<MutationErrorPayload>(response);

        if (!response.ok) {
            throw new Error(
                json?.errors
                    ? Object.values(json.errors)[0]?.[0] ??
                          json.message ??
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
            const payload = await withMinimumDuration(
                requestMutation(updateContents.url(server.id), 'PUT', {
                    contents: editorValue,
                    path: editorState.path,
                }),
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
        setState: Dispatch<SetStateAction<CreateEntryState>>,
        close: () => void,
    ): Promise<void> => {
        try {
            const payload = await withMinimumDuration(
                requestMutation(endpoint, 'POST', {
                    name: state.name,
                    path: currentPath,
                }),
            );

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
            const payload = await withMinimumDuration(
                requestMutation(destroy.url(server.id), 'DELETE', {
                    paths: pendingDeletePaths,
                }),
            );

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
            const payload = await withMinimumDuration(
                requestMutation(rename.url(server.id), 'PATCH', {
                    name: renameState.name,
                    path: renameState.path,
                }),
            );

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
                transferState.mode === 'copy'
                    ? copy.url(server.id)
                    : move.url(server.id);
            const payload = await withMinimumDuration(
                requestMutation(endpoint, 'POST', {
                    destination: transferState.destination,
                    paths: transferState.paths,
                }),
            );

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
            const payload = await withMinimumDuration(
                requestMutation(updatePermissions.url(server.id), 'PATCH', {
                    paths: permissionsState.paths,
                    permissions: permissionsState.permissions,
                }),
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
            const payload = await withMinimumDuration(
                requestMutation(archive.url(server.id), 'POST', {
                    name: archiveState.name,
                    path: archiveState.destination,
                    paths: archiveState.paths,
                }),
            );

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
            const payload = await withMinimumDuration(
                requestMutation(extract.url(server.id), 'POST', {
                    destination: extractState.destination,
                    path: extractState.path,
                }),
            );

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

        const nextUploadItems = Array.from(files).map((file) => ({
            name: file.name,
            progress: 0,
            size: file.size,
            status: 'pending' as const,
        }));
        setUploadItems(nextUploadItems);

        let successCount = 0;

        for (const [index, file] of Array.from(files).entries()) {
            setUploadItems((current) =>
                current.map((item, itemIndex) =>
                    itemIndex === index
                        ? { ...item, progress: 1, status: 'uploading' }
                        : item,
                ),
            );

            const formData = new FormData();
            formData.append('path', currentPath);
            formData.append('file', file);

            try {
                await uploadWithProgress(
                    upload.url(server.id),
                    formData,
                    (progress) => {
                        setUploadItems((current) =>
                            current.map((item, itemIndex) =>
                                itemIndex === index
                                    ? {
                                          ...item,
                                          progress,
                                          status: 'uploading',
                                      }
                                    : item,
                            ),
                        );
                    },
                );

                setUploadItems((current) =>
                    current.map((item, itemIndex) =>
                        itemIndex === index
                            ? { ...item, progress: 100, status: 'complete' }
                            : item,
                    ),
                );
                successCount += 1;
            } catch (error) {
                setUploadItems((current) =>
                    current.map((item, itemIndex) =>
                        itemIndex === index
                            ? {
                                  ...item,
                                  error:
                                      error instanceof Error
                                          ? error.message
                                          : 'The file could not be uploaded.',
                                  status: 'error',
                              }
                            : item,
                    ),
                );
            }
        }

        if (successCount > 0) {
            toast.success(
                successCount === 1
                    ? '1 file uploaded successfully.'
                    : `${successCount} files uploaded successfully.`,
            );
            reloadDirectory();
        }

        if (uploadInputRef.current) {
            uploadInputRef.current.value = '';
        }
    };

    const columns: Column<FileRow>[] = [
        
        {
            label: 'Name',
            width: 'w-[42%]',
            render: (entry) => {
                const visual = fileVisual(entry);
                const Icon = visual.icon;

                return (
                    <div className="flex min-w-0 items-center gap-3">
                        <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-md border border-black/5 dark:border-white/5 ${visual.wrapperClassName}`}
                        >
                            <Icon className={`size-4 ${visual.iconClassName}`} />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                                {entry.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                {visual.label}
                            </p>
                        </div>
                    </div>
                );
            },
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
                    description="Browse, upload, edit, archive, and organize files inside your server container."
                />

                <div className="-mt-5 mb-6 flex flex-wrap items-center justify-between gap-4 px-1">
                    <div className="flex items-center">
                        <InlinePathSummary
                            currentPath={currentPath}
                            onNavigate={navigateTo}
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                        {parentPath !== null ? (
                            <Button
                                variant="secondary"
                                onClick={() => navigateTo(parentPath)}
                            >
                                <FolderUp className="h-3.5 w-3.5" />
                                Up
                            </Button>
                        ) : null}
                        <Button
                            variant="secondary"
                            onClick={reloadDirectory}
                            disabled={refreshing}
                        >
                            {refreshing ? (
                                <Spinner />
                            ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Refresh
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => uploadInputRef.current?.click()}
                        >
                            <Upload className="h-3.5 w-3.5" />
                            Upload
                        </Button>
                        <Button onClick={() => setCreateDirectoryOpen(true)}>
                            <FolderPlus className="h-3.5 w-3.5" />
                            New folder
                        </Button>
                        <Button onClick={() => setCreateFileOpen(true)}>
                            <Plus className="h-3.5 w-3.5" />
                            New file
                        </Button>
                    </div>
                </div>

                {directoryError ? (
                    <Alert className="mb-6 border-[#d92400]/20 bg-[#d92400]/6">
                        <AlertCircle className="text-[#d92400]" />
                        <AlertTitle>Unable to load this directory</AlertTitle>
                        <AlertDescription>{directoryError}</AlertDescription>
                    </Alert>
                ) : null}

                <UploadProgressCard items={uploadItems} />

                <DataTable
                    data={fileTable}
                    columns={columns}
                    searchValue={search}
                    onSearch={setSearch}
                    selectable
                    selectedIds={selectedRowIds}
                    onSelectedIdsChange={(ids) => {
                        setSelectedPaths(
                            new Set(
                                filteredEntries
                                    .filter((entry) => ids.has(entry.id))
                                    .map((entry) => entry.path),
                            ),
                        );
                    }}
                    entityName="item"
                    emptyMessage="This directory is empty"
                    emptySearchMessage="Try another file name or clear your search."
                    onRowClick={(entry) => void openEntry(entry)}
                    rowMenu={(entry) => (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    type="button"
                                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all duration-150 ease-out hover:bg-muted hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
                                >
                                    <Ellipsis className="h-4 w-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onSelect={() => void openEntry(entry)}
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    {entry.kind === 'directory' ? 'Open' : 'Edit'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onSelect={() =>
                                        setRenameState({
                                            name: entry.name,
                                            path: entry.path,
                                        })
                                    }
                                >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onSelect={() =>
                                        setTransferState({
                                            destination: currentPath,
                                            mode: 'copy',
                                            paths: [entry.path],
                                        })
                                    }
                                >
                                    <CopyIcon className="mr-2 h-4 w-4" />
                                    Copy to...
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onSelect={() =>
                                        setTransferState({
                                            destination: currentPath,
                                            mode: 'move',
                                            paths: [entry.path],
                                        })
                                    }
                                >
                                    <MoveRight className="mr-2 h-4 w-4" />
                                    Move to...
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onSelect={() =>
                                        setPermissionsState({
                                            paths: [entry.path],
                                            permissions: entry.permissions ?? '644',
                                        })
                                    }
                                >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Permissions
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onSelect={() =>
                                        setArchiveState({
                                            destination: currentPath,
                                            name: defaultArchiveName([entry.path]),
                                            paths: [entry.path],
                                        })
                                    }
                                >
                                    <Archive className="mr-2 h-4 w-4" />
                                    Archive
                                </DropdownMenuItem>
                                {isArchive(entry) ? (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="cursor-pointer"
                                            onSelect={() =>
                                                setExtractState({
                                                    destination: currentPath,
                                                    path: entry.path,
                                                })
                                            }
                                        >
                                            <WandSparkles className="mr-2 h-4 w-4" />
                                            Extract...
                                        </DropdownMenuItem>
                                    </>
                                ) : null}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onSelect={() =>
                                        setPendingDeletePaths([entry.path])
                                    }
                                    variant="destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                />

                <input
                    ref={uploadInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => void uploadFiles(event.target.files)}
                />
            </div>

            <FilesBulkActionBar
                count={selectedPathList.length}
                onArchive={() =>
                    setArchiveState({
                        destination: currentPath,
                        name: defaultArchiveName(selectedPathList),
                        paths: selectedPathList,
                    })
                }
                onCancel={clearSelection}
                onCopy={() =>
                    setTransferState({
                        destination: currentPath,
                        mode: 'copy',
                        paths: selectedPathList,
                    })
                }
                onDelete={() => setPendingDeletePaths(selectedPathList)}
                onMove={() =>
                    setTransferState({
                        destination: currentPath,
                        mode: 'move',
                        paths: selectedPathList,
                    })
                }
                onPermissions={() =>
                    setPermissionsState({
                        paths: selectedPathList,
                        permissions:
                            directory?.entries.find(
                                (entry) => entry.path === selectedPathList[0],
                            )?.permissions ?? '644',
                    })
                }
            />

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
                            <Label htmlFor="new-file-name">File name</Label>
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
                                Create file
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
                        <DialogTitle>Create Folder</DialogTitle>
                        <DialogDescription>
                            This directory will be created as{' '}
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                                {`${pathLabel(currentPath)}/${createDirectoryState.name || 'new-folder'}`}
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="new-directory-name">Folder name</Label>
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
                                Create folder
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
                            Change the name without moving this file or folder.
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
                                Rename item
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
                            {transferState?.mode === 'copy'
                                ? 'Copy Items'
                                : 'Move Items'}
                        </DialogTitle>
                        <DialogDescription>
                            Choose a destination relative to{' '}
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
                                placeholder="plugins/backups"
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
                                {transferState?.mode === 'copy'
                                    ? 'Copy items'
                                    : 'Move items'}
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
                            Enter an octal mode such as 644 for files or 755 for executable folders.
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
                            <InputError
                                message={permissionsError ?? undefined}
                            />
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
                                Save permissions
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
                            The archive will be created in{' '}
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                                {pathLabel(archiveState?.destination ?? '')}
                            </span>
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
                                placeholder="plugins.zip"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="archive-destination">
                                Save to directory
                            </Label>
                            <Input
                                id="archive-destination"
                                value={archiveState?.destination ?? ''}
                                onChange={(event) => {
                                    setArchiveError(null);
                                    setArchiveState((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  destination:
                                                      event.target.value,
                                              }
                                            : current,
                                    );
                                }}
                                placeholder="backups"
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
                                Create archive
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
                            Archive:{' '}
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                                {pathLabel(extractState?.path ?? '')}
                            </span>
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
                                Extract archive
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
                        <div className="flex items-center gap-3 text-xs text-muted-foreground"></div>
                    </div>
                    <div className="min-h-0 flex-1 px-8 py-6">
                        {editorState ? (
                            <CodeEditor
                                path={editorState.path}
                                value={editorValue}
                                onChange={setEditorValue}
                            />
                        ) : null}
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-border/70 px-8 py-5">
                        <p className="text-sm text-muted-foreground">
                            {editorState
                                ? `${editorState.permissions ? `${editorState.permissions} · ` : ''}${detectEditorLanguage(editorState.path)} · ${formatBytes(editorState.size_bytes)}`
                                : 'Loading...'}
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
                                Save content
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
