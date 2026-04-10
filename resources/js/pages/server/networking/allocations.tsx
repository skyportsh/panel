import { Head, router } from "@inertiajs/react";
import { Copy, Network, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import {
    destroy,
    store,
    updatePrimary,
} from "@/actions/App/Http/Controllers/Client/ServerAllocationsController";
import Heading from "@/components/heading";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PlaceholderPattern } from "@/components/ui/placeholder-pattern";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/sonner";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import AppLayout from "@/layouts/app-layout";
import { home } from "@/routes";
import { console as serverConsole } from "@/routes/client/servers";
import type { BreadcrumbItem } from "@/types";

type AllocationEntry = {
    id: number;
    bind_ip: string;
    port: number;
    ip_alias: string | null;
    is_primary: boolean;
};

type Props = {
    server: {
        id: number;
        name: string;
        allocation_id: number;
    };
    allocations: AllocationEntry[];
    allocationsEnabled: boolean;
    allocationsLimit: number;
    currentAllocationCount: number;
};

function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
        toast.success("Copied to clipboard.");
    });
}

function AllocationRow({
    allocation,
    serverId,
}: {
    allocation: AllocationEntry;
    serverId: number;
}) {
    const [settingPrimary, setSettingPrimary] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const displayAddress = allocation.ip_alias
        ? `${allocation.ip_alias}:${allocation.port}`
        : `${allocation.bind_ip}:${allocation.port}`;

    const handleSetPrimary = () => {
        setSettingPrimary(true);

        router.patch(
            updatePrimary.url(serverId),
            { allocation_id: allocation.id },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Primary allocation updated.");
                },
                onError: (errors) => {
                    Object.values(errors).forEach((message) => {
                        toast.error(message);
                    });
                },
                onFinish: () => setSettingPrimary(false),
            },
        );
    };

    const handleDelete = () => {
        setDeleting(true);

        router.delete(
            destroy.url({ server: serverId, allocation: allocation.id }),
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Allocation removed.");
                },
                onError: (errors) => {
                    Object.values(errors).forEach((message) => {
                        toast.error(message);
                    });
                },
                onFinish: () => setDeleting(false),
            },
        );
    };

    return (
        <div className="group relative flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-1 py-1">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background text-muted-foreground shadow-xs ring-1 ring-border/60">
                <PlaceholderPattern
                    patternSize={4}
                    className="pointer-events-none absolute inset-0 size-full stroke-current opacity-[0.12]"
                />
                <Network className="relative h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 pl-2">
                <div className="flex items-center gap-2">
                    <code className="text-sm font-medium text-foreground">
                        {displayAddress}
                    </code>
                    {allocation.is_primary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            Primary
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    {allocation.ip_alias
                        ? `${allocation.bind_ip}:${allocation.port}`
                        : `Port ${allocation.port}`}
                </p>
            </div>
            <div className="flex items-center gap-1 pr-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => copyToClipboard(displayAddress)}
                        >
                            <Copy className="h-3.5 w-3.5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy address</TooltipContent>
                </Tooltip>

                {!allocation.is_primary && (
                    <>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground"
                                    disabled={settingPrimary}
                                    onClick={handleSetPrimary}
                                >
                                    {settingPrimary ? (
                                        <Spinner className="h-3.5 w-3.5" />
                                    ) : (
                                        <Star className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Make primary</TooltipContent>
                        </Tooltip>

                        <AlertDialog>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground"
                                            disabled={deleting}
                                        >
                                            {deleting ? (
                                                <Spinner className="h-3.5 w-3.5" />
                                            ) : (
                                                <Trash2 className="h-3.5 w-3.5" />
                                            )}
                                        </Button>
                                    </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Remove allocation
                                </TooltipContent>
                            </Tooltip>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Remove allocation
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Are you sure you want to remove{" "}
                                        <code className="rounded bg-muted px-1.5 py-0.5 font-medium">
                                            {displayAddress}
                                        </code>{" "}
                                        from this server?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete}>
                                        Remove
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                )}
            </div>
        </div>
    );
}

export default function ServerAllocations({
    server,
    allocations,
    allocationsEnabled,
    allocationsLimit,
    currentAllocationCount,
}: Props) {
    const [adding, setAdding] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: "Home", href: home() },
        { title: server.name, href: serverConsole.url(server.id) },
        {
            title: "Allocations",
            href: `/server/${server.id}/networking/allocations`,
        },
    ];

    const canAddMore =
        allocationsEnabled && currentAllocationCount < allocationsLimit;

    const handleAdd = () => {
        setAdding(true);

        router.post(
            store.url(server.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Allocation added.");
                },
                onError: (errors) => {
                    Object.values(errors).forEach((message) => {
                        toast.error(message);
                    });
                },
                onFinish: () => setAdding(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${server.name} — Allocations`} />

            <div className="px-4 py-6">
                <Heading
                    title="Allocations"
                    description="Manage the network port allocations for this server."
                />

                <div className="rounded-md bg-sidebar p-1">
                    <div className="rounded-md border border-sidebar-accent bg-background p-6">
                        <div className="flex items-center justify-between">
                            <Heading
                                variant="small"
                                title="Port allocations"
                                description="The primary allocation is the main address used to connect to this server."
                            />
                            {allocationsEnabled && (
                                <Button
                                    size="sm"
                                    disabled={!canAddMore || adding}
                                    onClick={handleAdd}
                                    title={
                                        !canAddMore
                                            ? `Maximum of ${allocationsLimit} extra allocation${allocationsLimit !== 1 ? "s" : ""} reached`
                                            : undefined
                                    }
                                >
                                    {adding ? (
                                        <Spinner />
                                    ) : (
                                        <Plus className="h-4 w-4" />
                                    )}
                                    Add allocation
                                </Button>
                            )}
                        </div>

                        <div className="mt-6 grid gap-2 sm:grid-cols-2">
                            {allocations.map((allocation) => (
                                <AllocationRow
                                    key={allocation.id}
                                    allocation={allocation}
                                    serverId={server.id}
                                />
                            ))}
                        </div>

                        {allocationsEnabled && (
                            <p className="mt-4 text-xs text-muted-foreground">
                                {currentAllocationCount} of {allocationsLimit}{" "}
                                extra allocation
                                {allocationsLimit !== 1 ? "s" : ""} used.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
