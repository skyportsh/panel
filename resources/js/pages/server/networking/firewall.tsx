import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowUpFromLine,
    Ban,
    Check,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import {
    destroy,
    store,
} from '@/actions/App/Http/Controllers/Client/ServerFirewallController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
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
import { cn } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import { home } from '@/routes';
import { console as serverConsole } from '@/routes/client/servers';
import type { BreadcrumbItem } from '@/types';

type FirewallRuleEntry = {
    id: number;
    direction: 'inbound' | 'outbound';
    action: 'allow' | 'deny';
    protocol: 'tcp' | 'udp' | 'icmp';
    source: string;
    port_start: number | null;
    port_end: number | null;
    notes: string | null;
    created_at: string | null;
};

type Props = {
    server: {
        id: number;
        name: string;
        status: string;
    };
    rules: FirewallRuleEntry[];
};

type RuleFormData = {
    direction: string;
    action: string;
    protocol: string;
    source: string;
    port_start: string;
    port_end: string;
    notes: string;
};

function formatPort(rule: FirewallRuleEntry): string {
    if (rule.protocol === 'icmp') {
        return '—';
    }

    if (!rule.port_start) {
        return 'Any';
    }

    if (rule.port_end && rule.port_end !== rule.port_start) {
        return `${rule.port_start}–${rule.port_end}`;
    }

    return String(rule.port_start);
}

function RuleCard({
    rule,
    serverId,
}: {
    rule: FirewallRuleEntry;
    serverId: number;
}) {
    const [deleting, setDeleting] = useState(false);
    const isAllow = rule.action === 'allow';
    const isInbound = rule.direction === 'inbound';

    const handleDelete = () => {
        setDeleting(true);

        router.delete(destroy.url({ server: serverId, rule: rule.id }), {
            preserveScroll: true,
            onSuccess: () => toast.success('Firewall rule deleted.'),
            onError: (errors) => {
                Object.values(errors).forEach((message) =>
                    toast.error(message),
                );
            },
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <div className="group relative flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-1 py-1">
            <div
                className={cn(
                    'relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-xs ring-1',
                    isAllow
                        ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20'
                        : 'bg-red-500/10 text-red-500 ring-red-500/20',
                )}
            >
                <PlaceholderPattern
                    patternSize={4}
                    className="pointer-events-none absolute inset-0 size-full stroke-current opacity-[0.12]"
                />
                {isAllow ? (
                    <Check className="relative h-4 w-4" />
                ) : (
                    <Ban className="relative h-4 w-4" />
                )}
            </div>

            <div className="min-w-0 flex-1 pl-2">
                <div className="flex items-center gap-2">
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                            isAllow
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400',
                        )}
                    >
                        {isAllow ? 'Allow' : 'Deny'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {isInbound ? 'Inbound' : 'Outbound'}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-medium uppercase text-muted-foreground">
                        {rule.protocol}
                    </span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{rule.source}</span>
                    <span>Port {formatPort(rule)}</span>
                    {rule.notes && (
                        <span className="truncate italic">{rule.notes}</span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-1 pr-2">
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
                        <TooltipContent>Delete rule</TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete rule</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete this firewall
                                rule? Traffic matching this rule will no longer
                                be filtered.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

function CreateRuleDialog({ serverId }: { serverId: number }) {
    const [open, setOpen] = useState(false);
    const form = useForm<RuleFormData>({
        direction: 'inbound',
        action: 'deny',
        protocol: 'tcp',
        source: '0.0.0.0/0',
        port_start: '',
        port_end: '',
        notes: '',
    });

    const isIcmp = form.data.protocol === 'icmp';

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(store.url(serverId), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
                toast.success('Firewall rule created.');
            },
            onError: (errors) => {
                Object.values(errors).forEach((message) =>
                    toast.error(message),
                );
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="h-4 w-4" />
                    Add rule
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>New firewall rule</DialogTitle>
                        <DialogDescription>
                            Create a rule to filter network traffic for this
                            server. The default policy is to allow all traffic.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-5 space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="grid gap-2">
                                <Label>Action</Label>
                                <Select
                                    value={form.data.action}
                                    onValueChange={(value) =>
                                        form.setData('action', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="allow">
                                            Allow
                                        </SelectItem>
                                        <SelectItem value="deny">
                                            Deny
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.action} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Direction</Label>
                                <Select
                                    value={form.data.direction}
                                    onValueChange={(value) =>
                                        form.setData('direction', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="inbound">
                                            Inbound
                                        </SelectItem>
                                        <SelectItem value="outbound">
                                            Outbound
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.direction} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Protocol</Label>
                                <Select
                                    value={form.data.protocol}
                                    onValueChange={(value) =>
                                        form.setData('protocol', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tcp">TCP</SelectItem>
                                        <SelectItem value="udp">UDP</SelectItem>
                                        <SelectItem value="icmp">
                                            ICMP
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={form.errors.protocol} />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="source">Source CIDR</Label>
                            <Input
                                id="source"
                                value={form.data.source}
                                onChange={(event) =>
                                    form.setData('source', event.target.value)
                                }
                                placeholder="0.0.0.0/0"
                            />
                            <InputError message={form.errors.source} />
                            <p className="text-xs text-muted-foreground">
                                Use{' '}
                                <code className="rounded bg-muted px-1 py-0.5">
                                    0.0.0.0/0
                                </code>{' '}
                                for all addresses, or a specific CIDR like{' '}
                                <code className="rounded bg-muted px-1 py-0.5">
                                    192.168.1.0/24
                                </code>
                                .
                            </p>
                        </div>

                        {!isIcmp && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="port_start">
                                        Port start
                                    </Label>
                                    <Input
                                        id="port_start"
                                        type="number"
                                        min={1}
                                        max={65535}
                                        value={form.data.port_start}
                                        onChange={(event) =>
                                            form.setData(
                                                'port_start',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="25565"
                                    />
                                    <InputError
                                        message={form.errors.port_start}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="port_end">
                                        Port end{' '}
                                        <span className="text-muted-foreground">
                                            (optional)
                                        </span>
                                    </Label>
                                    <Input
                                        id="port_end"
                                        type="number"
                                        min={1}
                                        max={65535}
                                        value={form.data.port_end}
                                        onChange={(event) =>
                                            form.setData(
                                                'port_end',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Same as start"
                                    />
                                    <InputError
                                        message={form.errors.port_end}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="notes">
                                Notes{' '}
                                <span className="text-muted-foreground">
                                    (optional)
                                </span>
                            </Label>
                            <Input
                                id="notes"
                                value={form.data.notes}
                                onChange={(event) =>
                                    form.setData('notes', event.target.value)
                                }
                                placeholder="e.g. Block SSH access"
                                maxLength={255}
                            />
                            <InputError message={form.errors.notes} />
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            Create rule
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function ServerFirewall({ server, rules }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: home() },
        { title: server.name, href: serverConsole.url(server.id) },
        {
            title: 'Firewall',
            href: `/server/${server.id}/networking/firewall`,
        },
    ];

    const inboundRules = rules.filter((rule) => rule.direction === 'inbound');
    const outboundRules = rules.filter(
        (rule) => rule.direction === 'outbound',
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${server.name} — Firewall`} />

            <div className="px-4 py-6">
                <Heading
                    title="Firewall"
                    description="Control inbound and outbound traffic to this server."
                />

                <div className="space-y-4">
                    <div className="rounded-md bg-sidebar p-1">
                        <div className="flex items-center justify-between rounded-md border border-sidebar-accent bg-background px-4 py-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">
                                    Default policy: Allow all traffic
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    All inbound and outbound connections are
                                    permitted unless a rule below blocks them.
                                </p>
                            </div>
                            <CreateRuleDialog serverId={server.id} />
                        </div>
                    </div>

                    <div className="rounded-md bg-sidebar p-1">
                        <div className="rounded-md border border-sidebar-accent bg-background p-6">
                            <Heading
                                variant="small"
                                title="Inbound rules"
                                description="Control incoming connections to this server."
                            />

                            {inboundRules.length > 0 ? (
                                <div className="mt-4 grid gap-2">
                                    {inboundRules.map((rule) => (
                                        <RuleCard
                                            key={rule.id}
                                            rule={rule}
                                            serverId={server.id}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-4 rounded-xl border border-dashed border-sidebar-border/70 px-4 py-6 text-center dark:border-sidebar-border">
                                    <p className="text-xs text-muted-foreground">
                                        No inbound rules — all incoming traffic
                                        is allowed.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-md bg-sidebar p-1">
                        <div className="rounded-md border border-sidebar-accent bg-background p-6">
                            <Heading
                                variant="small"
                                title="Outbound rules"
                                description="Control outgoing connections from this server."
                            />

                            {outboundRules.length > 0 ? (
                                <div className="mt-4 grid gap-2">
                                    {outboundRules.map((rule) => (
                                        <RuleCard
                                            key={rule.id}
                                            rule={rule}
                                            serverId={server.id}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-4 rounded-xl border border-dashed border-sidebar-border/70 px-4 py-6 text-center dark:border-sidebar-border">
                                    <p className="text-xs text-muted-foreground">
                                        No outbound rules — all outgoing traffic
                                        is allowed.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
