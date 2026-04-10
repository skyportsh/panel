import { Head, router, useForm } from '@inertiajs/react';
import { Copy, Link2, LogOut, Plus, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import {
    addServer,
    destroy,
    join,
    leave,
    removeServer,
    store,
} from '@/actions/App/Http/Controllers/Client/ServerInterconnectController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import ServerStatusIndicator from '@/components/server-status-indicator';
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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/sonner';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { home } from '@/routes';
import { console as serverConsole } from '@/routes/client/servers';
import type { BreadcrumbItem } from '@/types';

type ServerEntry = {
    id: number;
    name: string;
    status: string;
};

type InterconnectEntry = {
    id: number;
    name: string;
    servers: ServerEntry[];
    is_member: boolean;
};

type Props = {
    server: {
        id: number;
        name: string;
        status: string;
    };
    interconnects: InterconnectEntry[];
    eligibleServers: ServerEntry[];
    isOwner: boolean;
};

function slugify(name: string): string {
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return slug || 'server';
}

function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
        toast.success('Copied to clipboard.');
    });
}

function MemberRow({
    member,
    serverId,
    interconnectId,
    isSelf,
    isOwner,
}: {
    member: ServerEntry;
    serverId: number;
    interconnectId: number;
    isSelf: boolean;
    isOwner: boolean;
}) {
    const [removing, setRemoving] = useState(false);
    const alias = slugify(member.name);

    const handleRemove = () => {
        setRemoving(true);

        router.post(
            removeServer.url({
                server: serverId,
                interconnect: interconnectId,
            }),
            { server_id: member.id },
            {
                preserveScroll: true,
                onSuccess: () => toast.success(`${member.name} removed.`),
                onError: (errors) =>
                    Object.values(errors).forEach((m) => toast.error(m)),
                onFinish: () => setRemoving(false),
            },
        );
    };

    return (
        <div className="flex items-center justify-between rounded border border-border/50 bg-background px-4 py-4">
            <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                            {member.name}
                        </span>
                        {isSelf && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                This server
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <code className="text-xs text-muted-foreground">
                            [hostname] {alias}
                        </code>
                        <button
                            type="button"
                            onClick={() => copyToClipboard(alias)}
                            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                            <Copy className="h-2.5 w-2.5" />
                        </button>
                    </div>
                </div>
            </div>
            {isOwner && !isSelf && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            disabled={removing}
                            onClick={handleRemove}
                        >
                            {removing ? (
                                <Spinner className="h-3 w-3" />
                            ) : (
                                <Trash2 className="h-3 w-3" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove from network</TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}

function AddServerDialog({
    serverId,
    interconnect,
    eligibleServers,
}: {
    serverId: number;
    interconnect: InterconnectEntry;
    eligibleServers: ServerEntry[];
}) {
    const [open, setOpen] = useState(false);
    const [selectedId, setSelectedId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const memberIds = new Set(interconnect.servers.map((s) => s.id));
    const available = eligibleServers.filter((s) => !memberIds.has(s.id));

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (!selectedId) {
            return;
        }

        setSubmitting(true);

        router.post(
            addServer.url({
                server: serverId,
                interconnect: interconnect.id,
            }),
            { server_id: Number(selectedId) },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedId('');
                    setOpen(false);
                    toast.success('Server added to interconnect.');
                },
                onError: (errors) =>
                    Object.values(errors).forEach((m) => toast.error(m)),
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            disabled={available.length === 0}
                        >
                            <UserPlus className="h-3.5 w-3.5" />
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Add a server</TooltipContent>
            </Tooltip>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>
                            Add server to {interconnect.name}
                        </DialogTitle>
                        <DialogDescription>
                            Choose one of your servers on this node to join the
                            private network.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 grid gap-2">
                        <Label>Server</Label>
                        <Select
                            value={selectedId}
                            onValueChange={setSelectedId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a server" />
                            </SelectTrigger>
                            <SelectContent>
                                {available.map((s) => (
                                    <SelectItem
                                        key={s.id}
                                        value={String(s.id)}
                                    >
                                        <span className="flex items-center gap-2">
                                            <ServerStatusIndicator
                                                status={s.status}
                                                className="h-2.5 w-2.5"
                                            />
                                            {s.name}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="mt-6">
                        <Button
                            type="submit"
                            disabled={!selectedId || submitting}
                        >
                            {submitting && <Spinner />}
                            Add server
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function InterconnectCard({
    interconnect,
    serverId,
    eligibleServers,
    isOwner,
}: {
    interconnect: InterconnectEntry;
    serverId: number;
    eligibleServers: ServerEntry[];
    isOwner: boolean;
}) {
    const [leaving, setLeaving] = useState(false);
    const [joining, setJoining] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleJoin = () => {
        setJoining(true);
        router.post(
            join.url({ server: serverId, interconnect: interconnect.id }),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Joined interconnect.'),
                onError: (errors) =>
                    Object.values(errors).forEach((m) => toast.error(m)),
                onFinish: () => setJoining(false),
            },
        );
    };

    const handleLeave = () => {
        setLeaving(true);
        router.post(
            leave.url({ server: serverId, interconnect: interconnect.id }),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Left interconnect.'),
                onError: (errors) =>
                    Object.values(errors).forEach((m) => toast.error(m)),
                onFinish: () => setLeaving(false),
            },
        );
    };

    const handleDelete = () => {
        setDeleting(true);
        router.delete(
            destroy.url({ server: serverId, interconnect: interconnect.id }),
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Interconnect deleted.'),
                onError: (errors) =>
                    Object.values(errors).forEach((m) => toast.error(m)),
                onFinish: () => setDeleting(false),
            },
        );
    };

    return (
        <div className="rounded-md bg-sidebar p-1">
                                <div className="flex items-center gap-3 p-3 pb-4">
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                {interconnect.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {interconnect.servers.length} server
                                {interconnect.servers.length !== 1
                                    ? 's'
                                    : ''}{' '}
                                connected
                            </p>
                        </div>
                    </div>
            <div className="rounded-md border border-sidebar-accent bg-background p-1">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        {isOwner && (
                            <>
                                {interconnect.is_member ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground"
                                                disabled={leaving}
                                                onClick={handleLeave}
                                            >
                                                {leaving ? (
                                                    <Spinner className="h-3.5 w-3.5" />
                                                ) : (
                                                    <LogOut className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            Leave network
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={joining}
                                        onClick={handleJoin}
                                    >
                                        {joining && <Spinner />}
                                        Join
                                    </Button>
                                )}
                                <AddServerDialog
                                    serverId={serverId}
                                    interconnect={interconnect}
                                    eligibleServers={eligibleServers}
                                />
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
                                            Delete network
                                        </TooltipContent>
                                    </Tooltip>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>
                                                Delete {interconnect.name}
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will disconnect all
                                                servers from this private
                                                network. They will no longer
                                                be able to communicate over
                                                it.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>
                                                Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDelete}
                                            >
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </>
                        )}
                    </div>
                </div>

                {interconnect.servers.length > 0 && (
                    <div className="space-y-1.5">
                        {interconnect.servers.map((member) => (
                            <MemberRow
                                key={member.id}
                                member={member}
                                serverId={serverId}
                                interconnectId={interconnect.id}
                                isSelf={member.id === serverId}
                                isOwner={isOwner}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function CreateInterconnectDialog({ serverId }: { serverId: number }) {
    const [open, setOpen] = useState(false);
    const form = useForm({ name: '' });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(store.url(serverId), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
                toast.success('Interconnect created.');
            },
            onError: (errors) =>
                Object.values(errors).forEach((m) => toast.error(m)),
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="h-4 w-4" />
                    New network
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create interconnect</DialogTitle>
                        <DialogDescription>
                            Create a private network to link your servers on this
                            node. This server will be added automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 grid gap-2">
                        <Label htmlFor="ic-name">Network name</Label>
                        <Input
                            id="ic-name"
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            placeholder="my-network"
                            maxLength={64}
                            required
                        />
                        <InputError message={form.errors.name} />
                        <p className="text-xs text-muted-foreground">
                            Letters, numbers, dashes, and underscores only.
                        </p>
                    </div>
                    <DialogFooter className="mt-6">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            Create
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function ServerInterconnect({
    server,
    interconnects,
    eligibleServers,
    isOwner,
}: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: home() },
        { title: server.name, href: serverConsole.url(server.id) },
        {
            title: 'Interconnect',
            href: `/server/${server.id}/networking/interconnect`,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${server.name} — Interconnect`} />

            <div className="px-4 py-6">
                <Heading
                    title="Interconnect"
                    description="Create private networks between your servers on this node."
                />

                <div className="space-y-4">
                    <div className="rounded-md bg-sidebar p-1">
                        <div className="flex items-center justify-between rounded-md border border-sidebar-accent bg-background px-4 py-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">
                                    Private networks
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {isOwner
                                        ? 'Servers on the same interconnect can reach each other by hostname over a private link.'
                                        : "You're viewing this server as an admin. Only the server owner can manage interconnects."}
                                </p>
                            </div>
                            {isOwner && (
                                <CreateInterconnectDialog
                                    serverId={server.id}
                                />
                            )}
                        </div>
                    </div>

                    {interconnects.length > 0 ? (
                        interconnects.map((ic) => (
                            <InterconnectCard
                                key={ic.id}
                                interconnect={ic}
                                serverId={server.id}
                                eligibleServers={eligibleServers}
                                isOwner={isOwner}
                            />
                        ))
                    ) : (
                        <div className="rounded-md bg-sidebar p-1">
                            <div className="rounded-md border border-sidebar-accent bg-background p-6">
                                <div className="rounded-xl border border-dashed border-sidebar-border/70 px-4 py-6 text-center dark:border-sidebar-border">
                                    <p className="text-xs text-muted-foreground">
                                        No interconnects yet. Create one to
                                        privately link your servers.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
