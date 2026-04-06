import { Head, router, useForm } from "@inertiajs/react";
import { Download, Ellipsis, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
    bulkDestroy,
    destroy,
    downloadInstallLog,
    index as adminServers,
    reinstall,
    store,
    update,
} from "@/actions/App/Http/Controllers/Admin/ServersController";
import { ConfirmDeleteDialog, DataTable } from "@/components/admin/data-table";
import type { Column, PaginatedData } from "@/components/admin/data-table";
import InputError from "@/components/input-error";
import ServerIcon from "@/components/server-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlaceholderPattern } from "@/components/ui/placeholder-pattern";
import {
    Dialog,
    DialogContent,
    DialogContentFull,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import type { Tab } from "@/components/ui/sliding-tabs";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/sonner";
import AdminLayout from "@/layouts/admin/layout";
import AppLayout from "@/layouts/app-layout";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/types";

type UserOption = {
    id: number;
    name: string;
    email: string;
};

type NodeOption = {
    id: number;
    name: string;
};

type CargoOption = {
    id: number;
    name: string;
};

type AllocationOption = {
    id: number;
    node_id: number;
    bind_ip: string;
    port: number;
    ip_alias: string | null;
    server_id: number | null;
};

type AdminServer = {
    id: number;
    name: string;
    memory_mib: number;
    cpu_limit: number;
    disk_mib: number;
    status: string;
    last_error: string | null;
    created_at: string;
    updated_at: string;
    allocation: Omit<AllocationOption, "node_id" | "server_id">;
    user: UserOption;
    node: NodeOption;
    cargo: CargoOption;
};

type Props = {
    servers: PaginatedData<AdminServer>;
    users: UserOption[];
    nodes: NodeOption[];
    allocations: AllocationOption[];
    cargo: CargoOption[];
    filters: { search: string };
};

type ServerFormData = {
    name: string;
    user_id: number | "";
    node_id: number | "";
    cargo_id: number | "";
    allocation_id: number | "";
    memory_mib: number;
    cpu_limit: number;
    disk_mib: number;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Admin", href: adminServers.url() },
    { title: "Servers", href: adminServers.url() },
];

const tabs: Tab[] = [
    { id: "overview", label: "Overview" },
    { id: "edit", label: "Edit" },
    { id: "danger", label: "Danger" },
];

function formatLimit(value: number, suffix: string): string {
    return `${value.toLocaleString()} ${suffix}`;
}

function formatCpuLimit(value: number): string {
    return value === 0 ? "Unlimited" : `${value}%`;
}

function statusLabel(status: string): string {
    switch (status) {
        case "running":
            return "Running";
        case "installing":
            return "Installing";
        case "starting":
            return "Starting";
        case "offline":
            return "Offline";
        case "install_failed":
            return "Install failed";
        default:
            return "Installing";
    }
}

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
                        "text-3xl font-semibold text-foreground",
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

function OptionSelect({
    value,
    onChange,
    options,
    placeholder,
    renderLabel,
    disabled = false,
}: {
    value: number | "";
    onChange: (value: number) => void;
    options: Array<{ id: number }>;
    placeholder: string;
    renderLabel: (option: any) => string;
    disabled?: boolean;
}) {
    const selected = options.find((option) => option.id === value);

    return (
        <Select
            value={value === "" ? "" : String(value)}
            onValueChange={(selectedValue) => onChange(Number(selectedValue))}
            disabled={disabled}
        >
            <SelectTrigger className="w-full">
                <span
                    className={cn(
                        "truncate",
                        !selected && "text-muted-foreground",
                    )}
                >
                    {selected ? renderLabel(selected) : placeholder}
                </span>
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                        {renderLabel(option)}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function ServerFormFields({
    data,
    setData,
    errors,
    users,
    nodes,
    allocations,
    cargo,
    lockPlacement,
}: {
    data: ServerFormData;
    setData: <K extends keyof ServerFormData>(
        key: K,
        value: ServerFormData[K],
    ) => void;
    errors: Partial<Record<keyof ServerFormData, string>>;
    users: UserOption[];
    nodes: NodeOption[];
    allocations: AllocationOption[];
    cargo: CargoOption[];
    lockPlacement?: boolean;
}) {
    const availableAllocations = allocations.filter(
        (allocation) =>
            allocation.node_id === data.node_id &&
            (allocation.server_id === null ||
                allocation.id === data.allocation_id),
    );

    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="server-name">Name</Label>
                <Input
                    id="server-name"
                    value={data.name}
                    onChange={(event) => setData("name", event.target.value)}
                    placeholder="Paper Survival"
                    required
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label htmlFor="server-user">User</Label>
                <OptionSelect
                    value={data.user_id}
                    onChange={(value) => setData("user_id", value)}
                    options={users}
                    placeholder="Choose a user"
                    renderLabel={(user: UserOption) =>
                        `${user.name} · ${user.email}`
                    }
                />
                <InputError message={errors.user_id} />
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="server-node">Node</Label>
                    <OptionSelect
                        value={data.node_id}
                        onChange={(value) => {
                            setData("node_id", value);
                            setData("allocation_id", "");
                        }}
                        options={nodes}
                        placeholder="Choose a node"
                        renderLabel={(node: NodeOption) => node.name}
                        disabled={lockPlacement}
                    />
                    <InputError message={errors.node_id} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="server-cargo">Cargo</Label>
                    <OptionSelect
                        value={data.cargo_id}
                        onChange={(value) => setData("cargo_id", value)}
                        options={cargo}
                        placeholder="Choose a cargo"
                        renderLabel={(cargoItem: CargoOption) => cargoItem.name}
                        disabled={lockPlacement}
                    />
                    <InputError message={errors.cargo_id} />
                </div>
            </div>

            <div className="grid gap-2">
                <Label htmlFor="server-allocation">Primary allocation</Label>
                <OptionSelect
                    value={data.allocation_id}
                    onChange={(value) => setData("allocation_id", value)}
                    options={availableAllocations}
                    placeholder={
                        data.node_id === ""
                            ? "Choose a node first"
                            : "Choose an allocation"
                    }
                    renderLabel={(allocation: AllocationOption) =>
                        `${allocation.ip_alias ?? allocation.bind_ip}:${allocation.port}`
                    }
                />
                <InputError message={errors.allocation_id} />
            </div>

            <div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="server-memory">Memory (MiB)</Label>
                    <Input
                        id="server-memory"
                        type="number"
                        min={1}
                        value={data.memory_mib}
                        onChange={(event) =>
                            setData("memory_mib", Number(event.target.value))
                        }
                        required
                    />
                    <InputError message={errors.memory_mib} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="server-cpu">CPU (%)</Label>
                    <Input
                        id="server-cpu"
                        type="number"
                        min={0}
                        value={data.cpu_limit}
                        onChange={(event) =>
                            setData("cpu_limit", Number(event.target.value))
                        }
                        required
                    />
                    <InputError message={errors.cpu_limit} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="server-disk">Disk (MiB)</Label>
                    <Input
                        id="server-disk"
                        type="number"
                        min={1}
                        value={data.disk_mib}
                        onChange={(event) =>
                            setData("disk_mib", Number(event.target.value))
                        }
                        required
                    />
                    <InputError message={errors.disk_mib} />
                </div>
            </div>
        </div>
    );
}

function CreateServerModal({
    users,
    nodes,
    allocations,
    cargo,
    onClose,
}: {
    users: UserOption[];
    nodes: NodeOption[];
    allocations: AllocationOption[];
    cargo: CargoOption[];
    onClose: () => void;
}) {
    const form = useForm<ServerFormData>({
        name: "",
        user_id: users[0]?.id ?? "",
        node_id: nodes[0]?.id ?? "",
        cargo_id: cargo[0]?.id ?? "",
        allocation_id: "",
        memory_mib: 2048,
        cpu_limit: 100,
        disk_mib: 10240,
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
                toast.success("Server created");
                onClose();
            },
            onError: (errors) => {
                Object.values(errors).forEach((message) => {
                    toast.error(message);
                });
            },
        });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create server</DialogTitle>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <ServerFormFields
                        data={form.data}
                        setData={form.setData}
                        errors={form.errors}
                        users={users}
                        nodes={nodes}
                        allocations={allocations}
                        cargo={cargo}
                    />

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={submitting || form.processing}
                        >
                            {(submitting || form.processing) && <Spinner />}
                            Create server
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ServerModal({
    server,
    users,
    nodes,
    allocations,
    cargo,
    onClose,
    onDelete,
}: {
    server: AdminServer;
    users: UserOption[];
    nodes: NodeOption[];
    allocations: AllocationOption[];
    cargo: CargoOption[];
    onClose: () => void;
    onDelete: (server: AdminServer) => void;
}) {
    const [tab, setTab] = useState("overview");
    const [confirmingReinstall, setConfirmingReinstall] = useState(false);
    const [reinstalling, setReinstalling] = useState(false);
    const form = useForm<ServerFormData>({
        name: server.name,
        user_id: server.user.id,
        node_id: server.node.id,
        cargo_id: server.cargo.id,
        allocation_id: server.allocation.id,
        memory_mib: server.memory_mib,
        cpu_limit: server.cpu_limit,
        disk_mib: server.disk_mib,
    });
    const minimumMs = 500;
    const submitStart = useRef(0);
    const [submitting, setSubmitting] = useState(false);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.patch(update.url(server.id), {
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
                toast.success("Server updated");
            },
            onError: (errors) => {
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
                            <ServerIcon className="size-6 text-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-lg">
                                {server.name}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                Owned by {server.user.name}
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
                    {tab === "overview" ? (
                        <div className="space-y-4">
                            {server.status === "install_failed" ? (
                                <div className="relative overflow-hidden rounded-lg border border-[#d92400]/30 bg-[#d92400]/8 px-4 py-3">
                                    <PlaceholderPattern
                                        patternSize={8}
                                        className="pointer-events-none absolute inset-0 size-full stroke-[#d92400] opacity-[0.12]"
                                    />
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-semibold text-[#d92400] dark:text-[#ff8a6b]">
                                                This server cannot be recovered
                                                automatically.
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                The daemon reported an install
                                                failure. Download the install
                                                log, then trigger a force
                                                reinstall to rebuild the server
                                                from scratch.
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                            <a
                                                href={downloadInstallLog.url(
                                                    server.id,
                                                )}
                                                className={buttonVariants({
                                                    size: "table",
                                                    variant: "outline",
                                                })}
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                Download install log
                                            </a>
                                            <Button
                                                size="table"
                                                variant="destructive"
                                                disabled={reinstalling}
                                                onClick={() =>
                                                    setConfirmingReinstall(true)
                                                }
                                            >
                                                {reinstalling && <Spinner />}
                                                <RotateCcw className="h-3.5 w-3.5" />
                                                Force reinstall
                                            </Button>
                                        </div>
                                    </div>
                                    {server.last_error ? (
                                        <p className="mt-3 rounded-md bg-background/80 px-3 py-2 font-mono text-xs text-foreground">
                                            {server.last_error}
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}

                            <div className="flex gap-6">
                                <div className="min-w-0 flex-1 space-y-1">
                                    {[
                                        {
                                            label: "Server ID",
                                            value: `#${server.id}`,
                                        },
                                        { label: "Name", value: server.name },
                                        {
                                            label: "User",
                                            value: server.user.name,
                                        },
                                        {
                                            label: "Node",
                                            value: server.node.name,
                                        },
                                        {
                                            label: "Cargo",
                                            value: server.cargo.name,
                                        },
                                        {
                                            label: "Allocation",
                                            value: `${server.allocation.ip_alias ?? server.allocation.bind_ip}:${server.allocation.port}`,
                                        },
                                        {
                                            label: "Memory",
                                            value: formatLimit(
                                                server.memory_mib,
                                                "MiB",
                                            ),
                                        },
                                        {
                                            label: "CPU",
                                            value: formatCpuLimit(
                                                server.cpu_limit,
                                            ),
                                        },
                                        {
                                            label: "Disk",
                                            value: formatLimit(
                                                server.disk_mib,
                                                "MiB",
                                            ),
                                        },
                                        {
                                            label: "Created",
                                            value: formatDate(
                                                server.created_at,
                                                true,
                                            ),
                                        },
                                        {
                                            label: "Last updated",
                                            value: formatDate(
                                                server.updated_at,
                                                true,
                                            ),
                                        },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className="flex items-center justify-between gap-4 rounded-md px-3 py-2.5"
                                        >
                                            <span className="text-sm text-muted-foreground">
                                                {item.label}
                                            </span>
                                            <span className="max-w-[70%] truncate text-right text-sm font-medium text-foreground">
                                                {item.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="w-[320px] shrink-0 space-y-3">
                                    <StackedStatCard
                                        label="Status"
                                        value={statusLabel(server.status)}
                                        description={
                                            server.status === "install_failed"
                                                ? "Download the install log or force a reinstall."
                                                : "Daemon lifecycle status"
                                        }
                                        valueClassName={
                                            server.status === "install_failed"
                                                ? "text-[#d92400] dark:text-[#ff8a6b]"
                                                : server.status === "running"
                                                  ? "text-emerald-600 dark:text-emerald-400"
                                                  : undefined
                                        }
                                    />
                                    <StackedStatCard
                                        label="Volume path"
                                        value={`volumes/${server.id}`}
                                        description="Planned server files location"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {tab === "edit" ? (
                        <div className="max-w-3xl space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    Server configuration
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Update ownership, primary allocation, and
                                    resource limits.
                                </p>
                            </div>

                            <form onSubmit={submit} className="space-y-4">
                                <div className="relative overflow-hidden rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                                    <PlaceholderPattern
                                        patternSize={8}
                                        className="pointer-events-none absolute inset-0 size-full stroke-current opacity-[0.08]"
                                    />
                                    <div className="relative">
                                        Node and cargo cannot be changed after a
                                        server is created. Resource updates are
                                        applied immediately if the server is
                                        offline, or queued until the next
                                        restart or start.
                                    </div>
                                </div>
                                <ServerFormFields
                                    data={form.data}
                                    setData={form.setData}
                                    errors={form.errors}
                                    users={users}
                                    nodes={nodes}
                                    allocations={allocations}
                                    cargo={cargo}
                                    lockPlacement
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

                    {tab === "danger" ? (
                        <div className="max-w-xl space-y-4">
                            <div className="overflow-hidden rounded-lg bg-muted/40">
                                <div className="px-4 py-2.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Danger zone
                                    </span>
                                </div>
                                <div className="rounded-lg border border-border/70 bg-background p-5">
                                    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-5">
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">
                                                Force reinstall
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Delete the server files and run
                                                the cargo installer again.
                                            </p>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            className="cursor-pointer"
                                            disabled={reinstalling}
                                            onClick={() =>
                                                setConfirmingReinstall(true)
                                            }
                                        >
                                            {reinstalling && <Spinner />}
                                            <RotateCcw className="h-4 w-4" />
                                            Force reinstall
                                        </Button>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">
                                                Delete server
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Permanently remove this server
                                                record from the panel.
                                            </p>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            className="cursor-pointer"
                                            onClick={() => onDelete(server)}
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

            <ConfirmDeleteDialog
                open={confirmingReinstall}
                onOpenChange={setConfirmingReinstall}
                title={`Force reinstall ${server.name}?`}
                description="This will delete the current server files and rerun the cargo installer. The server will start automatically after a successful reinstall."
                loading={reinstalling}
                confirmLabel="Force reinstall"
                onConfirm={() => {
                    setReinstalling(true);
                    router.post(
                        reinstall.url(server.id),
                        {},
                        {
                            preserveScroll: true,
                            onSuccess: () => {
                                toast.success(
                                    `${server.name} reinstall requested`,
                                );
                                setConfirmingReinstall(false);
                            },
                            onFinish: () => setReinstalling(false),
                        },
                    );
                }}
            />
        </Dialog>
    );
}

export default function Servers({
    servers,
    users,
    nodes,
    allocations,
    cargo,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search);
    const [creatingServer, setCreatingServer] = useState(false);
    const [viewingServer, setViewingServer] = useState<AdminServer | null>(
        null,
    );
    const [deletingServer, setDeletingServer] = useState<AdminServer | null>(
        null,
    );
    const [singleDeleting, setSingleDeleting] = useState(false);

    const navigate = (params: Record<string, string | undefined>) => {
        router.get(adminServers.url(), params as Record<string, string>, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        navigate({ search: value || undefined });
    };

    const serverMap = useMemo(
        () => new Map(servers.data.map((item) => [item.id, item])),
        [servers.data],
    );

    const columns: Column<AdminServer>[] = [
        {
            label: "Server",
            width: "w-[34%]",
            render: (server) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                        <ServerIcon className="size-5 text-foreground" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                            {server.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            #{server.id}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            label: "User",
            width: "w-[24%]",
            render: (server) => (
                <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">
                        {server.user.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {server.user.email}
                    </p>
                </div>
            ),
        },
        {
            label: "Node / Cargo",
            width: "flex-1 min-w-0",
            render: (server) => (
                <div className="text-xs text-muted-foreground">
                    <p>{server.node.name}</p>
                    <p>{server.cargo.name}</p>
                </div>
            ),
        },
    ];

    const rowMenu = (server: AdminServer) => (
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
                    onSelect={() => setDeletingServer(server)}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin — Servers" />

            <AdminLayout
                title="Servers"
                description="Manage all servers that are available on the system."
            >
                <DataTable
                    data={servers}
                    columns={columns}
                    searchValue={search}
                    onSearch={handleSearch}
                    onRowClick={(server) =>
                        setViewingServer(serverMap.get(server.id) ?? server)
                    }
                    rowMenu={rowMenu}
                    bulkDeleteUrl={bulkDestroy.url()}
                    entityName="server"
                    emptyMessage="No servers found"
                    actions={
                        <Button
                            size="table"
                            onClick={() => setCreatingServer(true)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Create new
                        </Button>
                    }
                />
            </AdminLayout>

            {creatingServer ? (
                <CreateServerModal
                    users={users}
                    nodes={nodes}
                    allocations={allocations}
                    cargo={cargo}
                    onClose={() => setCreatingServer(false)}
                />
            ) : null}

            {viewingServer ? (
                <ServerModal
                    server={viewingServer}
                    users={users}
                    nodes={nodes}
                    allocations={allocations}
                    cargo={cargo}
                    onClose={() => setViewingServer(null)}
                    onDelete={setDeletingServer}
                />
            ) : null}

            <ConfirmDeleteDialog
                open={deletingServer !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingServer(null);
                    }
                }}
                title={`Delete ${deletingServer?.name ?? "server"}?`}
                description="This action cannot be undone. The selected server will be permanently removed."
                loading={singleDeleting}
                onConfirm={() => {
                    if (!deletingServer) {
                        return;
                    }

                    setSingleDeleting(true);
                    router.delete(destroy.url(deletingServer.id), {
                        onSuccess: () => {
                            toast.success(`${deletingServer.name} deleted`);
                            setViewingServer(null);
                            setDeletingServer(null);
                        },
                        onFinish: () => setSingleDeleting(false),
                    });
                }}
            />
        </AppLayout>
    );
}
