import { Head, router, useForm } from '@inertiajs/react';
import {
    Copy,
    Ellipsis,
    Globe,
    Plus,
    ShieldCheck,
    ShieldX,
    Trash2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import {
    bulkDestroy,
    destroy,
    index as adminNodes,
    store,
    update,
} from '@/actions/App/Http/Controllers/Admin/NodesController';
import { ConfirmDeleteDialog, DataTable } from '@/components/admin/data-table';
import type { Column, PaginatedData } from '@/components/admin/data-table';
import { CountryFlagIcon, CountryFlagOption } from '@/components/country-flag';
import InputError from '@/components/input-error';
import { toast } from '@/components/ui/sonner';
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
    const connectionStatus = node.connection_status ?? node.status ?? 'draft';

    const currentStatus = node.daemon_uuid ? connectionStatus : 'draft';

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
                                    : 'Draft'}
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
                    onClick={generateConfigurationToken}
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
        </div>
    );
}

function CreateNodeModal({
    onClose,
    locations,
}: {
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
        <Dialog open onOpenChange={(open) => !open && onClose()}>
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
    onClose,
    onDelete,
    locations,
}: {
    node: AdminNode;
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
            onSuccess: () => {
                toast.success('Node updated');
            },
            onError: (errors: Record<string, string>) => {
                Object.values(errors).forEach((message) => {
                    toast.error(message);
                });
            },
        });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
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
            </DialogContentFull>
        </Dialog>
    );
}

export default function Nodes({ nodes, locations, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [viewingNode, setViewingNode] = useState<AdminNode | null>(null);
    const [creatingNode, setCreatingNode] = useState(false);
    const [deletingNode, setDeletingNode] = useState<AdminNode | null>(null);
    const [singleDeleting, setSingleDeleting] = useState(false);

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

    const columns: Column<AdminNode>[] = [
        {
            label: 'Node',
            width: 'w-[35%]',
            render: (node) => (
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                        {node.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {node.fqdn}
                    </p>
                </div>
            ),
        },
        {
            label: 'Status',
            width: 'w-[18%]',
            render: (node) => {
                const status = node.connection_status ?? node.status ?? 'draft';
                const statusColors: Record<string, string> = {
                    online: 'text-emerald-600 dark:text-emerald-400',
                    offline: 'text-red-600 dark:text-red-400',
                    configured: 'text-amber-600 dark:text-amber-400',
                    draft: 'text-muted-foreground',
                };
                const statusLabels: Record<string, string> = {
                    online: 'Online',
                    offline: 'Offline',
                    configured: 'Configured',
                    draft: 'Draft',
                };
                return (
                    <span
                        className={cn(
                            'text-sm font-medium',
                            statusColors[status],
                        )}
                    >
                        {statusLabels[status]}
                    </span>
                );
            },
        },
        {
            label: 'Location',
            width: 'w-[18%]',
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
            width: 'flex-1',
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
                description="Manage your machine endpoints, ports, and regional placement."
            >
                <DataTable
                    data={nodes}
                    columns={columns}
                    searchValue={search}
                    onSearch={handleSearch}
                    onRowClick={(node) =>
                        setViewingNode(nodeMap.get(node.id) ?? node)
                    }
                    rowMenu={rowMenu}
                    bulkDeleteUrl={bulkDestroy.url()}
                    entityName="node"
                    emptyMessage="No nodes found"
                    actions={
                        <Button
                            size="table"
                            onClick={() => setCreatingNode(true)}
                            disabled={locations.length === 0}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Create new
                        </Button>
                    }
                />
            </AdminLayout>

            {creatingNode ? (
                <CreateNodeModal
                    onClose={() => setCreatingNode(false)}
                    locations={locations}
                />
            ) : null}

            {viewingNode ? (
                <NodeModal
                    node={viewingNode}
                    onClose={() => setViewingNode(null)}
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
                            setViewingNode(null);
                            setDeletingNode(null);
                        },
                        onFinish: () => setSingleDeleting(false),
                    });
                }}
            />
        </AppLayout>
    );
}
