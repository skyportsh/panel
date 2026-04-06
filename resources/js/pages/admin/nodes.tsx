import { Head, router, useForm } from '@inertiajs/react';
import {
    Copy,
    Ellipsis,
    Globe,
    Heart,
    Plus,
    ShieldCheck,
    ShieldX,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    bulkDestroy,
    destroy,
    index as adminNodes,
    store,
    storeAllocation,
    update,
} from '@/actions/App/Http/Controllers/Admin/NodesController';
import { ConfirmDeleteDialog, DataTable } from '@/components/admin/data-table';
import type { Column, PaginatedData } from '@/components/admin/data-table';
import { CountryFlagIcon, CountryFlagOption } from '@/components/country-flag';
import InputError from '@/components/input-error';
import { toast } from '@/components/ui/sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from '@/components/ui/select';
import { SlidingTabs } from '@/components/ui/sliding-tabs';
import type { Tab } from '@/components/ui/sliding-tabs';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDialogState } from '@/hooks/use-dialog-state';
import AdminLayout from '@/layouts/admin/layout';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type LocationOption = {
    id: number;
    name: string;
    country: string;
};

type NodeAllocation = {
    id: number;
    bind_ip: string;
    port: number;
    ip_alias: string | null;
    is_assigned: boolean;
};

type AdminNode = {
    id: number;
    name: string;
    fqdn: string;
    daemon_port: number;
    sftp_port: number;
    use_ssl: boolean;
    created_at: string;
    updated_at: string;
    location: LocationOption;
    allocations: NodeAllocation[];
    status?: string;
    connection_status?: 'online' | 'offline' | 'configured' | 'draft';
    last_seen_at?: string;
    daemon_uuid?: string;
    daemon_version?: string;
    enrolled_at?: string;
};

type Props = {
    nodes: PaginatedData<AdminNode>;
    locations: LocationOption[];
    filters: { search: string };
};

type NodeFormData = {
    name: string;
    location_id: number | '';
    fqdn: string;
    daemon_port: number;
    sftp_port: number;
    use_ssl: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: adminNodes.url() },
    { title: 'Nodes', href: adminNodes.url() },
];

const tabs: Tab[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'edit', label: 'Edit' },
    { id: 'allocations', label: 'Allocations' },
    { id: 'configure', label: 'Configure' },
    { id: 'danger', label: 'Danger' },
];

function StackedStatCard({
    label,
    value,
    description,
    valueClassName,
}: {
    label: string;
    value: string;
    description?: string;
    valueClassName?: string;
}) {
    return (
        <div className="overflow-hidden rounded-lg bg-muted/40">
            <div className="px-4 py-2.5">
                <span className="text-xs font-medium text-muted-foreground">
                    {label}
                </span>
            </div>
            <div className="rounded-lg border border-border/70 bg-background p-5">
                <p
                    className={cn(
                        'text-3xl font-semibold text-foreground',
                        valueClassName,
                    )}
                >
                    {value}
                </p>
                {description ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {description}
                    </p>
                ) : null}
            </div>
        </div>
    );
}

function resolveNodePresence(
    node: AdminNode,
): 'online' | 'offline' | 'unconfigured' {
    const status = node.connection_status ?? node.status ?? 'draft';

    if (!node.daemon_uuid || status === 'draft' || status === 'configured') {
        return 'unconfigured';
    }

    return status === 'online' ? 'online' : 'offline';
}

function formatDetailedRelativeTime(
    value: string | null | undefined,
    now: number,
): string {
    if (!value) {
        return 'never';
    }

    const seconds = Math.max(
        0,
        Math.round((now - new Date(value).getTime()) / 1000),
    );

    if (seconds < 60) {
        return 'just now';
    }

    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }

    const hours = Math.round(minutes / 60);
    if (hours < 24) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

function NodeConnectionIndicator({
    node,
    now,
}: {
    node: AdminNode;
    now: number;
}) {
    const presence = resolveNodePresence(node);
    const isOnline = presence === 'online';

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="relative inline-flex size-5 shrink-0 items-center justify-center">
                    {isOnline ? (
                        <span className="absolute inset-1 rounded-full bg-emerald-400/20 blur-[3px] animate-[node-heartbeat-glow_1.6s_ease-in-out_infinite] dark:bg-emerald-300/20" />
                    ) : null}
                    <Heart
                        className={cn(
                            'relative size-4 origin-center transition-colors',
                            isOnline
                                ? 'fill-emerald-700 text-emerald-700 animate-[node-heartbeat_1.6s_ease-in-out_infinite] dark:fill-emerald-600 dark:text-emerald-600'
                                : 'fill-transparent text-muted-foreground/60',
                        )}
                        aria-hidden="true"
                    />
                </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="px-3 py-2 text-left">
                {presence === 'online' ? (
                    <div className="space-y-0.5">
                        <p className="text-sm font-medium">Online</p>
                        <p className="text-xs text-muted-foreground">
                            {node.daemon_version
                                ? `skyportd ${node.daemon_version}`
                                : 'skyportd unknown'}
                        </p>
                    </div>
                ) : presence === 'offline' ? (
                    <div className="space-y-0.5">
                        <p className="text-sm font-medium">Offline</p>
                        <p className="text-xs text-muted-foreground">
                            Last seen{' '}
                            {formatDetailedRelativeTime(node.last_seen_at, now)}
                        </p>
                    </div>
                ) : (
                    <p className="text-sm font-medium">Not configured yet</p>
                )}
            </TooltipContent>
        </Tooltip>
    );
}

function LocationSelect({
    value,
    onChange,
    locations,
}: {
    value: number | '';
    onChange: (value: number) => void;
    locations: LocationOption[];
}) {
    const selectedLocation = locations.find(
        (location) => location.id === value,
    );

    return (
        <Select
            value={value === '' ? '' : String(value)}
            onValueChange={(selected) => onChange(Number(selected))}
        >
            <SelectTrigger className="w-full">
                <span
                    className={cn(
                        'truncate',
                        !selectedLocation && 'text-muted-foreground',
                    )}
                >
                    {selectedLocation
                        ? selectedLocation.name
                        : 'Choose a location'}
                </span>
            </SelectTrigger>
            <SelectContent>
                {locations.map((location) => (
                    <SelectItem key={location.id} value={String(location.id)}>
                        <span className="flex items-center gap-2">
                            <CountryFlagOption countryName={location.country} />
                            <span className="text-muted-foreground">·</span>
                            <span>{location.name}</span>
                        </span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function NodeFormFields({
    data,
    setData,
    errors,
    locations,
}: {
    data: NodeFormData;
    setData: <K extends keyof NodeFormData>(
        key: K,
        value: NodeFormData[K],
    ) => void;
    errors: Partial<Record<keyof NodeFormData, string>>;
    locations: LocationOption[];
}) {
    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="node-name">Name</Label>
                <Input
                    id="node-name"
                    value={data.name}
                    onChange={(event) => setData('name', event.target.value)}
                    placeholder="London 01"
                    required
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label>Location</Label>
                <LocationSelect
                    value={data.location_id}
                    onChange={(value) => setData('location_id', value)}
                    locations={locations}
                />
                <InputError message={errors.location_id} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="node-fqdn">FQDN</Label>
                <Input
                    id="node-fqdn"
                    value={data.fqdn}
                    onChange={(event) => setData('fqdn', event.target.value)}
                    placeholder="node-01.example.com"
                    required
                />
                <InputError message={errors.fqdn} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="node-daemon-port">Daemon port</Label>
                    <Input
                        id="node-daemon-port"
                        type="number"
                        value={data.daemon_port}
                        onChange={(event) =>
                            setData('daemon_port', Number(event.target.value))
                        }
                        min={1}
                        max={65535}
                        required
                    />
                    <InputError message={errors.daemon_port} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="node-sftp-port">SFTP port</Label>
                    <Input
                        id="node-sftp-port"
                        type="number"
                        value={data.sftp_port}
                        onChange={(event) =>
                            setData('sftp_port', Number(event.target.value))
                        }
                        min={1}
                        max={65535}
                        required
                    />
                    <InputError message={errors.sftp_port} />
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <Label htmlFor="node-use-ssl">SSL</Label>
                    <p className="text-xs text-muted-foreground">
                        Enable secure daemon connections for this node.
                    </p>
                </div>
                <Switch
                    id="node-use-ssl"
                    checked={data.use_ssl}
                    onCheckedChange={(checked) => setData('use_ssl', checked)}
                />
            </div>
        </div>
    );
}

function csrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ''
    );
}

type ConfigurationData = {
    token: string;
    expires_at: string;
    status: string;
};

type AllocationFormData = {
    mode: 'single' | 'range';
    bind_ip: string;
    ip_alias: string;
    port: string;
    start_port: string;
    end_port: string;
};

function CreateAllocationModal({
    node,
    onClose,
}: {
    node: AdminNode;
    onClose: () => void;
}) {
    const form = useForm<AllocationFormData>({
        mode: 'single',
        bind_ip: '0.0.0.0',
        ip_alias: node.fqdn,
        port: '',
        start_port: '',
        end_port: '',
    });
    const minimumMs = 500;
    const submitStart = useRef(0);
    const [submitting, setSubmitting] = useState(false);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(storeAllocation.url(node.id), {
            preserveScroll: true,
            onStart: () => {
                submitStart.current = Date.now();
                setSubmitting(true);
            },
            onFinish: () => {
                const remaining = minimumMs - (Date.now() - submitStart.current);
                setTimeout(() => setSubmitting(false), Math.max(0, remaining));
            },
            onSuccess: () => {
                toast.success('Allocation created');
                onClose();
            },
            onError: (errors) => {
                Object.values(errors).forEach((message) => toast.error(message));
            },
        });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create allocation</DialogTitle>
                    <DialogDescription>
                        Add a single port or a port range to this node.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Mode</Label>
                        <Select
                            value={form.data.mode}
                            onValueChange={(value: 'single' | 'range') => form.setData('mode', value)}
                        >
                            <SelectTrigger className="w-full">
                                <span>{form.data.mode === 'single' ? 'Single port' : 'Port range'}</span>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="single">Single port</SelectItem>
                                <SelectItem value="range">Port range</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="allocation-bind-ip">Bind IP</Label>
                            <Input
                                id="allocation-bind-ip"
                                value={form.data.bind_ip}
                                onChange={(event) => form.setData('bind_ip', event.target.value)}
                                placeholder="0.0.0.0"
                                required
                            />
                            <InputError message={form.errors.bind_ip} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="allocation-ip-alias">IP alias</Label>
                            <Input
                                id="allocation-ip-alias"
                                value={form.data.ip_alias}
                                onChange={(event) => form.setData('ip_alias', event.target.value)}
                                placeholder={node.fqdn}
                            />
                            <InputError message={form.errors.ip_alias} />
                        </div>
                    </div>

                    {form.data.mode === 'single' ? (
                        <div className="grid gap-2">
                            <Label htmlFor="allocation-port">Port</Label>
                            <Input
                                id="allocation-port"
                                type="number"
                                min={1}
                                max={65535}
                                value={form.data.port}
                                onChange={(event) => form.setData('port', event.target.value)}
                                required
                            />
                            <InputError message={form.errors.port} />
                        </div>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="allocation-start-port">Start port</Label>
                                <Input
                                    id="allocation-start-port"
                                    type="number"
                                    min={1}
                                    max={65535}
                                    value={form.data.start_port}
                                    onChange={(event) => form.setData('start_port', event.target.value)}
                                    required
                                />
                                <InputError message={form.errors.start_port} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="allocation-end-port">End port</Label>
                                <Input
                                    id="allocation-end-port"
                                    type="number"
                                    min={1}
                                    max={65535}
                                    value={form.data.end_port}
                                    onChange={(event) => form.setData('end_port', event.target.value)}
                                    required
                                />
                                <InputError message={form.errors.end_port} />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button type="submit" size="sm" disabled={submitting || form.processing}>
                            {(submitting || form.processing) && <Spinner />}
                            Create allocation
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ConfigureTab({
    node,
    onUpdateStatus,
}: {
    node: AdminNode;
    onUpdateStatus: (status: string) => void;
}) {
    const [configurationData, setConfigurationData] =
        useState<ConfigurationData | null>(null);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showReconfigureWarning, setShowReconfigureWarning] = useState(false);
    const connectionStatus = node.connection_status ?? node.status ?? 'draft';

    const currentStatus = node.daemon_uuid ? connectionStatus : 'draft';
    const requiresReconfigureWarning =
        currentStatus === 'online' || currentStatus === 'offline';

    const generateConfigurationToken = async () => {
        setGenerating(true);
        try {
            const response = await fetch(
                `/admin/nodes/${node.id}/configure-token`,
                {
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrfToken(),
                    },
                    method: 'POST',
                },
            );

            if (!response.ok) {
                throw new Error('Failed to generate configuration token');
            }

            const data = await response.json();
            setConfigurationData(data);
            onUpdateStatus(data.status);
            toast.success('Configuration token generated');
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Failed to generate configuration token';
            toast.error(message);
        } finally {
            setGenerating(false);
        }
    };

    const requestConfigurationToken = () => {
        if (requiresReconfigureWarning) {
            setShowReconfigureWarning(true);
            return;
        }

        void generateConfigurationToken();
    };

    const copyToClipboard = async () => {
        if (configurationData?.token) {
            await navigator.clipboard.writeText(configurationData.token);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h3 className="text-sm font-semibold text-foreground">
                    Daemon Configuration
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                    Manage node configuration status and generate configuration
                    tokens for daemon registration.
                </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-background p-4">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            Status
                        </span>
                        <span
                            className={`text-sm font-medium ${
                                currentStatus === 'online'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : currentStatus === 'offline'
                                      ? 'text-red-600 dark:text-red-400'
                                      : currentStatus === 'configured'
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : 'text-muted-foreground'
                            }`}
                        >
                            {currentStatus === 'online'
                                ? 'Online'
                                : currentStatus === 'offline'
                                  ? 'Offline'
                                  : currentStatus === 'configured'
                                    ? 'Configured'
                                    : 'Not configured yet'}
                        </span>
                    </div>

                    {node.daemon_uuid && node.last_seen_at && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Last Seen
                            </span>
                            <span className="text-sm text-foreground">
                                {formatDate(node.last_seen_at, true)}
                            </span>
                        </div>
                    )}

                    {node.daemon_uuid && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Daemon UUID
                            </span>
                            <span className="text-sm font-mono text-foreground">
                                {node.daemon_uuid}
                            </span>
                        </div>
                    )}

                    {node.daemon_version && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Daemon Version
                            </span>
                            <span className="text-sm font-medium text-foreground">
                                {node.daemon_version}
                            </span>
                        </div>
                    )}

                    {node.enrolled_at && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Enrolled At
                            </span>
                            <span className="text-sm text-foreground">
                                {formatDate(node.enrolled_at, true)}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {configurationData ? (
                <div className="rounded-lg border border-border/70 bg-muted/30 p-4">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Token
                            </span>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={copyToClipboard}
                                className="h-7 cursor-pointer"
                            >
                                <Copy className="mr-1.5 h-3.5 w-3.5" />
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                        </div>
                        <div className="break-all rounded bg-muted/60 px-3 py-2 font-mono text-xs text-foreground">
                            {configurationData.token}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Expires</span>
                            <span>
                                {formatDate(configurationData.expires_at, true)}
                            </span>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="flex justify-start">
                <Button
                    onClick={requestConfigurationToken}
                    disabled={generating}
                    className="cursor-pointer"
                >
                    {generating ? (
                        <>
                            <Spinner />
                            Generating...
                        </>
                    ) : (
                        'Generate Configuration Token'
                    )}
                </Button>
            </div>

            <AlertDialog
                open={showReconfigureWarning}
                onOpenChange={setShowReconfigureWarning}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Refresh configuration token?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            A daemon is already running for this node. If you
                            continue, you will need to reconfigure skyportd with
                            the new token before it can connect again.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={generating}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={generating}
                            onClick={(event) => {
                                event.preventDefault();
                                setShowReconfigureWarning(false);
                                void generateConfigurationToken();
                            }}
                        >
                            {generating ? <Spinner /> : null}
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function CreateNodeModal({
    open,
    onClose,
    locations,
}: {
    open: boolean;
    onClose: () => void;
    locations: LocationOption[];
}) {
    const form = useForm<NodeFormData>({
        name: '',
        location_id: locations[0]?.id ?? '',
        fqdn: '',
        daemon_port: 2800,
        sftp_port: 3128,
        use_ssl: false,
    });
    const minimumMs = 500;
    const submitStart = useRef(0);
    const [submitting, setSubmitting] = useState(false);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(store.url(), {
            preserveScroll: true,
            onStart: () => {
                submitStart.current = Date.now();
                setSubmitting(true);
            },
            onFinish: () => {
                const remaining =
                    minimumMs - (Date.now() - submitStart.current);
                setTimeout(() => setSubmitting(false), Math.max(0, remaining));
            },
            onSuccess: () => {
                toast.success('Node created');
                onClose();
            },
            onError: (errors: Record<string, string>) => {
                Object.values(errors).forEach((message) => {
                    toast.error(message);
                });
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create node</DialogTitle>
                    <DialogDescription className="sr-only">
                        Create a new node and assign it to an existing location.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <NodeFormFields
                        data={form.data}
                        setData={form.setData}
                        errors={form.errors}
                        locations={locations}
                    />

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={submitting || form.processing}
                        >
                            {(submitting || form.processing) && <Spinner />}
                            Create node
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function NodeModal({
    node,
    open,
    onClose,
    onDelete,
    locations,
}: {
    node: AdminNode;
    open: boolean;
    onClose: () => void;
    onDelete: (node: AdminNode) => void;
    locations: LocationOption[];
}) {
    const [tab, setTab] = useState('overview');
    const form = useForm<NodeFormData>({
        name: node.name,
        location_id: node.location.id,
        fqdn: node.fqdn,
        daemon_port: node.daemon_port,
        sftp_port: node.sftp_port,
        use_ssl: node.use_ssl,
    });
    const minimumMs = 500;
    const submitStart = useRef(0);
    const [submitting, setSubmitting] = useState(false);
    const [creatingAllocation, setCreatingAllocation] = useState(false);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.patch(update.url(node.id), {
            preserveScroll: true,
            onStart: () => {
                submitStart.current = Date.now();
                setSubmitting(true);
            },
            onFinish: () => {
                const remaining =
                    minimumMs - (Date.now() - submitStart.current);
                setTimeout(() => setSubmitting(false), Math.max(0, remaining));
            },
            onSuccess: (page) => {
                const flash = (
                    page.props as {
                        flash?: {
                            info?: string;
                            success?: string;
                            warning?: string;
                        };
                    }
                ).flash;

                if (flash?.success) {
                    toast.success(flash.success);
                }

                if (flash?.warning) {
                    toast.info(flash.warning);
                }

                if (flash?.info) {
                    toast.info(flash.info);
                }
            },
            onError: (errors: Record<string, string>) => {
                Object.values(errors).forEach((message) => {
                    toast.error(message);
                });
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContentFull>
                <div className="px-8 pt-8 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/60">
                            <Globe className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-lg">
                                {node.name}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                View and manage details for {node.name}.
                            </DialogDescription>
                            <p className="text-sm text-muted-foreground">
                                {node.fqdn}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <SlidingTabs
                            tabs={tabs}
                            active={tab}
                            onChange={setTab}
                        />
                    </div>
                </div>

                <div className="border-t border-border/60" />

                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {tab === 'overview' ? (
                        <div className="flex gap-6">
                            <div className="min-w-0 flex-1 space-y-1">
                                {[
                                    { label: 'Node ID', value: `#${node.id}` },
                                    { label: 'Name', value: node.name },
                                    {
                                        label: 'Location',
                                        value: node.location.name,
                                    },
                                    {
                                        label: 'Country',
                                        value: node.location.country,
                                    },
                                    { label: 'FQDN', value: node.fqdn },
                                    {
                                        label: 'Daemon port',
                                        value: String(node.daemon_port),
                                    },
                                    {
                                        label: 'SFTP port',
                                        value: String(node.sftp_port),
                                    },
                                    {
                                        label: 'Created',
                                        value: formatDate(
                                            node.created_at,
                                            true,
                                        ),
                                    },
                                    {
                                        label: 'Last updated',
                                        value: formatDate(
                                            node.updated_at,
                                            true,
                                        ),
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className="flex items-center justify-between rounded-md px-3 py-2.5"
                                    >
                                        <span className="text-sm text-muted-foreground">
                                            {item.label}
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="w-[300px] shrink-0 space-y-3">
                                <StackedStatCard
                                    label="SSL"
                                    value={
                                        node.use_ssl ? 'Enabled' : 'Disabled'
                                    }
                                    valueClassName={
                                        node.use_ssl
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-muted-foreground'
                                    }
                                    description={
                                        node.use_ssl
                                            ? 'Secure daemon connections are active.'
                                            : 'Daemon connections use plain HTTP.'
                                    }
                                />
                                <StackedStatCard
                                    label="Ports"
                                    value={`${node.daemon_port} / ${node.sftp_port}`}
                                    description="Daemon / SFTP"
                                />
                            </div>
                        </div>
                    ) : null}

                    {tab === 'edit' ? (
                        <div className="max-w-2xl">
                            <h3 className="text-sm font-semibold text-foreground">
                                Configuration
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Update this node's connectivity, ports, and
                                assigned location.
                            </p>

                            <form onSubmit={submit} className="mt-6 space-y-4">
                                <NodeFormFields
                                    data={form.data}
                                    setData={form.setData}
                                    errors={form.errors}
                                    locations={locations}
                                />

                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={submitting || form.processing}
                                    >
                                        {(submitting || form.processing) && (
                                            <Spinner />
                                        )}
                                        Save changes
                                    </Button>
                                </div>
                            </form>
                        </div>
                    ) : null}

                    {tab === 'allocations' ? (
                        <div className="max-w-3xl space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Allocations
                                    </h3>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Bind ports to this node for server assignments.
                                    </p>
                                </div>
                                <Button
                                    size="table"
                                    onClick={() => setCreatingAllocation(true)}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Create allocation
                                </Button>
                            </div>

                            {node.allocations.length > 0 ? (
                                <div className="overflow-hidden rounded-lg bg-muted/40">
                                    <div className="rounded-lg border border-border/70 bg-background p-1">
                                        <div className="grid grid-cols-[160px_1fr_120px] gap-4 border-b border-border/60 px-4 py-2 text-xs font-medium text-muted-foreground">
                                            <span>Bind</span>
                                            <span>Alias</span>
                                            <span>Status</span>
                                        </div>
                                        <div className="divide-y divide-border/60">
                                            {node.allocations.map((allocation) => (
                                                <div
                                                    key={allocation.id}
                                                    className="grid grid-cols-[160px_1fr_120px] gap-4 px-4 py-3"
                                                >
                                                    <p className="font-mono text-xs text-foreground">
                                                        {allocation.bind_ip}:{allocation.port}
                                                    </p>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {allocation.ip_alias || node.fqdn}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {allocation.is_assigned ? 'Assigned' : 'Available'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-border/70 bg-background px-4 py-10 text-center">
                                    <p className="text-sm font-medium text-foreground">
                                        No allocations yet
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Create a single port or range to assign server primary ports.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : null}

                    {tab === 'configure' ? (
                        <ConfigureTab
                            node={node}
                            onUpdateStatus={(status) => {
                                node.status = status;
                            }}
                        />
                    ) : null}

                    {tab === 'danger' ? (
                        <div className="max-w-xl space-y-4">
                            <div className="overflow-hidden rounded-lg bg-muted/40">
                                <div className="px-4 py-2.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Danger zone
                                    </span>
                                </div>
                                <div className="rounded-lg border border-border/70 bg-background p-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">
                                                Delete node
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Permanently remove this node
                                                from the platform.
                                            </p>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            className="cursor-pointer"
                                            onClick={() => onDelete(node)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
                {creatingAllocation ? (
                    <CreateAllocationModal
                        node={node}
                        onClose={() => setCreatingAllocation(false)}
                    />
                ) : null}
            </DialogContentFull>
        </Dialog>
    );
}

export default function Nodes({ nodes, locations, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const viewingNodeDialog = useDialogState<AdminNode>();
    const creatingNodeDialog = useDialogState<boolean>();
    const [deletingNode, setDeletingNode] = useState<AdminNode | null>(null);
    const [singleDeleting, setSingleDeleting] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    const navigate = (params: Record<string, string | undefined>) => {
        router.get(adminNodes.url(), params as Record<string, string>, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        navigate({ search: value || undefined });
    };

    const nodeMap = useMemo(
        () => new Map(nodes.data.map((node) => [node.id, node])),
        [nodes.data],
    );

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        const poller = window.setInterval(() => {
            router.get(
                window.location.pathname + window.location.search,
                {},
                {
                    only: ['nodes'],
                    preserveScroll: true,
                    preserveState: true,
                    replace: true,
                },
            );
        }, 5000);

        return () => window.clearInterval(poller);
    }, []);

    useEffect(() => {
        viewingNodeDialog.setPayload((current) => {
            if (!current) {
                return current;
            }

            return nodeMap.get(current.id) ?? null;
        });
    }, [nodeMap, viewingNodeDialog]);

    const columns: Column<AdminNode>[] = [
        {
            label: 'Node',
            width: 'w-[34%]',
            render: (node) => (
                <div className="flex min-w-0 items-center gap-2.5">
                    <NodeConnectionIndicator node={node} now={now} />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                            {node.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {node.fqdn}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            label: 'Location',
            width: 'w-[20%]',
            render: (node) => (
                <div className="flex items-center gap-2">
                    <CountryFlagIcon
                        countryName={node.location.country}
                        className="[&_svg]:size-4"
                    />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                            {node.location.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {node.location.country}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            label: 'SSL',
            width: 'w-[8%]',
            render: (node) => (
                <div className="flex items-center">
                    {node.use_ssl ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            </TooltipTrigger>
                            <TooltipContent>SSL enabled</TooltipContent>
                        </Tooltip>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <ShieldX className="h-4 w-4 text-muted-foreground/60" />
                            </TooltipTrigger>
                            <TooltipContent>SSL disabled</TooltipContent>
                        </Tooltip>
                    )}
                </div>
            ),
        },
    ];

    const rowMenu = (node: AdminNode) => (
        <DropdownMenu modal={false}>
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
                    onSelect={() => setDeletingNode(node)}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin — Nodes" />

            <AdminLayout
                title="Nodes"
                description="Nodes are where your servers live."
            >
                <DataTable
                    data={nodes}
                    columns={columns}
                    searchValue={search}
                    onSearch={handleSearch}
                    onRowClick={(node) =>
                        viewingNodeDialog.show(nodeMap.get(node.id) ?? node)
                    }
                    rowMenu={rowMenu}
                    bulkDeleteUrl={bulkDestroy.url()}
                    entityName="node"
                    emptyMessage="No nodes found"
                    actions={
                        <Button
                            size="table"
                            onClick={() => creatingNodeDialog.show(true)}
                            disabled={locations.length === 0}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Create new
                        </Button>
                    }
                />
            </AdminLayout>

            {creatingNodeDialog.payload ? (
                <CreateNodeModal
                    open={creatingNodeDialog.open}
                    onClose={creatingNodeDialog.hide}
                    locations={locations}
                />
            ) : null}

            {viewingNodeDialog.payload ? (
                <NodeModal
                    node={viewingNodeDialog.payload}
                    open={viewingNodeDialog.open}
                    onClose={viewingNodeDialog.hide}
                    onDelete={setDeletingNode}
                    locations={locations}
                />
            ) : null}

            <ConfirmDeleteDialog
                open={deletingNode !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingNode(null);
                    }
                }}
                title={`Delete ${deletingNode?.name ?? 'node'}?`}
                description="This action cannot be undone. The selected node will be permanently removed."
                loading={singleDeleting}
                onConfirm={() => {
                    if (!deletingNode) {
                        return;
                    }

                    setSingleDeleting(true);
                    router.delete(destroy.url(deletingNode.id), {
                        onSuccess: () => {
                            toast.success(`${deletingNode.name} deleted`);
                            if (
                                viewingNodeDialog.payload?.id ===
                                deletingNode.id
                            ) {
                                viewingNodeDialog.hide();
                            }
                            setDeletingNode(null);
                        },
                        onFinish: () => setSingleDeleting(false),
                    });
                }}
            />
        </AppLayout>
    );
}
