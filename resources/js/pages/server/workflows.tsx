import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import {
    destroy,
    store,
    update,
} from '@/actions/App/Http/Controllers/Client/ServerWorkflowsController';
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
import { SlidingTabs } from '@/components/ui/sliding-tabs';
import type { Tab } from '@/components/ui/sliding-tabs';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
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

type StepData = {
    id: string;
    type: 'trigger' | 'condition' | 'action';
    kind: string;
    config: Record<string, string>;
};

type WorkflowEntry = {
    id: number;
    name: string;
    enabled: boolean;
    nodes: StepData[];
    edges: never[];
    updated_at: string | null;
};

type Props = {
    server: { id: number; name: string; status: string };
    workflows: WorkflowEntry[];
};

const triggerOptions = [
    { value: 'schedule', label: 'On a schedule', desc: 'Run every N minutes' },
    { value: 'state_change', label: 'On state change', desc: 'When server enters a state' },
    { value: 'startup', label: 'On server start', desc: 'When the server starts' },
    { value: 'shutdown', label: 'On server stop', desc: 'When the server stops' },
    { value: 'backup_complete', label: 'On backup complete', desc: 'After a backup finishes' },
    { value: 'backup_failed', label: 'On backup failed', desc: 'When a backup fails' },
    { value: 'console_match', label: 'On console output', desc: 'When console matches a pattern' },
    { value: 'high_cpu', label: 'On high CPU usage', desc: 'When CPU exceeds a threshold' },
    { value: 'high_memory', label: 'On high memory usage', desc: 'When memory exceeds a threshold' },
    { value: 'disk_full', label: 'On disk full', desc: 'When disk usage exceeds a threshold' },
    { value: 'crash', label: 'On crash', desc: 'When the server crashes unexpectedly' },
];

const conditionOptions = [
    { value: 'server_online', label: 'Server is online', desc: 'Only if the server is running' },
    { value: 'server_offline', label: 'Server is offline', desc: 'Only if the server is stopped' },
    { value: 'cpu_above', label: 'CPU usage above', desc: 'Only if CPU exceeds a percentage' },
    { value: 'cpu_below', label: 'CPU usage below', desc: 'Only if CPU is below a percentage' },
    { value: 'memory_above', label: 'Memory usage above', desc: 'Only if memory exceeds a percentage' },
    { value: 'memory_below', label: 'Memory usage below', desc: 'Only if memory is below a percentage' },
    { value: 'time_between', label: 'Time is between', desc: 'Only during certain hours' },
    { value: 'day_of_week', label: 'Day of week', desc: 'Only on specific days' },
    { value: 'cooldown', label: 'Cooldown', desc: 'Wait at least N minutes between runs' },
];

const actionOptions = [
    { value: 'run_command', label: 'Run command', desc: 'Send a console command' },
    { value: 'power_start', label: 'Start server', desc: 'Start the server' },
    { value: 'power_stop', label: 'Stop server', desc: 'Stop the server gracefully' },
    { value: 'power_restart', label: 'Restart server', desc: 'Restart the server' },
    { value: 'power_kill', label: 'Kill server', desc: 'Forcefully kill the server' },
    { value: 'create_backup', label: 'Create backup', desc: 'Create a new backup' },
    { value: 'delete_oldest_backup', label: 'Delete oldest backup', desc: 'Remove the oldest backup' },
    { value: 'webhook', label: 'Send webhook', desc: 'Send an HTTP request' },
    { value: 'delay', label: 'Wait', desc: 'Pause for a duration before continuing' },
    { value: 'broadcast', label: 'Broadcast message', desc: 'Send a say/broadcast command' },
    { value: 'run_multiple_commands', label: 'Run multiple commands', desc: 'Send several commands in order' },
];

const allOptions = [...triggerOptions, ...conditionOptions, ...actionOptions];

function labelFor(step: StepData): string {
    return allOptions.find((o) => o.value === step.kind)?.label ?? step.kind;
}

function summaryFor(step: StepData): string | null {
    const c = step.config;
    if (step.kind === 'schedule' && c.interval) return `Every ${c.interval} min`;
    if (step.kind === 'state_change' && c.target_state) return `→ ${c.target_state}`;
    if (step.kind === 'console_match' && c.pattern) return c.pattern;
    if (step.kind === 'high_cpu' && c.threshold) return `> ${c.threshold}%`;
    if (step.kind === 'high_memory' && c.threshold) return `> ${c.threshold}%`;
    if (step.kind === 'disk_full' && c.threshold) return `> ${c.threshold}%`;

    if (step.kind === 'cpu_above' && c.threshold) return `> ${c.threshold}%`;
    if (step.kind === 'cpu_below' && c.threshold) return `< ${c.threshold}%`;
    if (step.kind === 'memory_above' && c.threshold) return `> ${c.threshold}%`;
    if (step.kind === 'memory_below' && c.threshold) return `< ${c.threshold}%`;
    if (step.kind === 'time_between' && c.start && c.end) return `${c.start}–${c.end}`;
    if (step.kind === 'day_of_week' && c.days) return c.days;
    if (step.kind === 'cooldown' && c.minutes) return `${c.minutes} min`;
    if (step.kind === 'run_command' && c.command) return c.command;
    if (step.kind === 'broadcast' && c.message) return c.message;
    if (step.kind === 'webhook' && c.url) return c.url;
    if (step.kind === 'delay' && c.seconds) return `${c.seconds}s`;
    if (step.kind === 'run_multiple_commands' && c.commands) return `${c.commands.split('\n').length} commands`;
    return null;
}

function typeLabel(type: StepData['type']): string {
    return type === 'trigger' ? 'When' : type === 'condition' ? 'If' : 'Then';
}

// --- Config fields ---

function StepConfigFields({
    step,
    onChange,
}: {
    step: StepData;
    onChange: (config: Record<string, string>) => void;
}) {
    const set = (key: string, value: string) => onChange({ ...step.config, [key]: value });
    const c = step.config;

    switch (step.kind) {
        case 'schedule':
            return (
                <div className="grid gap-2">
                    <Label>Interval (minutes)</Label>
                    <Input type="number" min={1} value={c.interval ?? ''} onChange={(e) => set('interval', e.target.value)} placeholder="10" />
                </div>
            );
        case 'state_change':
            return (
                <div className="grid gap-2">
                    <Label>Target state</Label>
                    <Select value={c.target_state ?? ''} onValueChange={(v) => set('target_state', v)}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                            {['running', 'offline', 'starting', 'stopping', 'installing'].map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        case 'console_match':
            return (
                <div className="grid gap-2">
                    <Label>Pattern (contains)</Label>
                    <Input value={c.pattern ?? ''} onChange={(e) => set('pattern', e.target.value)} placeholder="Exception" className="font-mono text-xs" />
                </div>
            );
        case 'high_cpu':
        case 'high_memory':
        case 'disk_full':
        case 'cpu_above':
        case 'cpu_below':
        case 'memory_above':
        case 'memory_below':
            return (
                <div className="grid gap-2">
                    <Label>Threshold (%)</Label>
                    <Input type="number" min={0} max={100} value={c.threshold ?? ''} onChange={(e) => set('threshold', e.target.value)} placeholder="90" />
                </div>
            );

        case 'time_between':
            return (
                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                        <Label>Start time</Label>
                        <Input type="time" value={c.start ?? ''} onChange={(e) => set('start', e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>End time</Label>
                        <Input type="time" value={c.end ?? ''} onChange={(e) => set('end', e.target.value)} />
                    </div>
                </div>
            );
        case 'day_of_week':
            return (
                <div className="grid gap-2">
                    <Label>Days (comma-separated)</Label>
                    <Input value={c.days ?? ''} onChange={(e) => set('days', e.target.value)} placeholder="Mon,Wed,Fri" />
                </div>
            );
        case 'cooldown':
            return (
                <div className="grid gap-2">
                    <Label>Cooldown (minutes)</Label>
                    <Input type="number" min={1} value={c.minutes ?? ''} onChange={(e) => set('minutes', e.target.value)} placeholder="30" />
                </div>
            );
        case 'run_command':
            return (
                <div className="grid gap-2">
                    <Label>Command</Label>
                    <Input value={c.command ?? ''} onChange={(e) => set('command', e.target.value)} placeholder="say Hello" className="font-mono text-xs" />
                </div>
            );
        case 'broadcast':
            return (
                <div className="grid gap-2">
                    <Label>Message</Label>
                    <Input value={c.message ?? ''} onChange={(e) => set('message', e.target.value)} placeholder="Server restarting soon!" />
                </div>
            );
        case 'run_multiple_commands':
            return (
                <div className="grid gap-2">
                    <Label>Commands (one per line)</Label>
                    <textarea
                        value={c.commands ?? ''}
                        onChange={(e) => set('commands', e.target.value)}
                        placeholder={'say Restarting in 10s\nsave-all\nstop'}
                        rows={4}
                        className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 font-mono text-xs focus-visible:ring-2 focus-visible:outline-none"
                    />
                </div>
            );
        case 'webhook':
            return (
                <div className="space-y-3">
                    <div className="grid gap-2">
                        <Label>URL</Label>
                        <Input value={c.url ?? ''} onChange={(e) => set('url', e.target.value)} placeholder="https://example.com/hook" className="font-mono text-xs" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Method</Label>
                        <Select value={c.method ?? 'POST'} onValueChange={(v) => set('method', v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GET">GET</SelectItem>
                                <SelectItem value="POST">POST</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            );
        case 'delay':
            return (
                <div className="grid gap-2">
                    <Label>Seconds</Label>
                    <Input type="number" min={1} value={c.seconds ?? ''} onChange={(e) => set('seconds', e.target.value)} placeholder="5" />
                </div>
            );
        default:
            return null;
    }
}

// --- Step row ---

function StepRow({
    step,
    onUpdate,
    onRemove,
}: {
    step: StepData;
    onUpdate: (step: StepData) => void;
    onRemove: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const summary = summaryFor(step);

    return (
        <div className="rounded-lg border border-border/70 bg-muted/20">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground">{typeLabel(step.type)}</span>
                        <span className="text-sm font-medium text-foreground">{labelFor(step)}</span>
                    </div>
                    {summary && !expanded && (
                        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{summary}</p>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                        <Trash2 className="h-3 w-3" />
                    </Button>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </button>
            {expanded && (
                <div className="border-t border-border/50 px-4 py-3">
                    <StepConfigFields step={step} onChange={(config) => onUpdate({ ...step, config })} />
                </div>
            )}
        </div>
    );
}

// --- Add step dialog ---

const addTabs: Tab[] = [
    { id: 'trigger', label: 'Triggers' },
    { id: 'condition', label: 'Conditions' },
    { id: 'action', label: 'Actions' },
];

function AddStepDialog({ onAdd }: { onAdd: (type: StepData['type'], kind: string) => void }) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<string>('trigger');

    const items = tab === 'trigger' ? triggerOptions : tab === 'condition' ? conditionOptions : actionOptions;
    const stepType = tab as StepData['type'];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm">
                    <Plus className="h-3.5 w-3.5" />
                    Add step
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add step</DialogTitle>
                    <DialogDescription>Choose what to add to this workflow.</DialogDescription>
                </DialogHeader>

                <SlidingTabs tabs={addTabs} active={tab} onChange={setTab} />

                <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
                    {items.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => { onAdd(stepType, item.value); setOpen(false); }}
                            className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
                        >
                            <div>
                                <p className="text-sm font-medium text-foreground">{item.label}</p>
                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                            </div>
                            <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-muted-foreground/50" />
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- Workflow editor ---

function WorkflowEditor({
    workflow,
    serverId,
    onBack,
}: {
    workflow: WorkflowEntry;
    serverId: number;
    onBack: () => void;
}) {
    const [steps, setSteps] = useState<StepData[]>((workflow.nodes as StepData[]) ?? []);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    const updateStep = useCallback((index: number, step: StepData) => {
        setSteps((s) => s.map((st, i) => (i === index ? step : st)));
        setDirty(true);
    }, []);

    const removeStep = useCallback((index: number) => {
        setSteps((s) => s.filter((_, i) => i !== index));
        setDirty(true);
    }, []);

    const addStep = (type: StepData['type'], kind: string) => {
        setSteps((s) => [...s, { id: `${type}-${Date.now()}`, type, kind, config: {} }]);
        setDirty(true);
    };

    const save = () => {
        setSaving(true);
        router.patch(
            update.url({ server: serverId, workflow: workflow.id }),
            { nodes: steps, edges: [] },
            {
                preserveScroll: true,
                onSuccess: () => { setDirty(false); toast.success('Workflow saved.'); },
                onError: (errors) => Object.values(errors).forEach((m) => toast.error(m)),
                onFinish: () => setSaving(false),
            },
        );
    };

    const triggers = steps.filter((s) => s.type === 'trigger');
    const conditions = steps.filter((s) => s.type === 'condition');
    const actions = steps.filter((s) => s.type === 'action');

    return (
        <div className="px-4 py-6">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-lg font-semibold tracking-tight">{workflow.name}</h2>
                        <p className="text-xs text-muted-foreground">
                            {steps.length} step{steps.length !== 1 ? 's' : ''}{dirty ? ' · Unsaved' : ''}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <AddStepDialog onAdd={addStep} />
                    <Button size="sm" onClick={save} disabled={!dirty || saving}>
                        {saving && <Spinner />}
                        Save
                    </Button>
                </div>
            </div>

            <div className="space-y-4">
                {triggers.length > 0 && (
                    <div className="rounded-md bg-sidebar p-1">
                        <div className="rounded-md border border-sidebar-accent bg-background p-4">
                            <p className="mb-3 text-xs font-medium text-muted-foreground">Triggers</p>
                            <div className="space-y-2">
                                {triggers.map((step) => (
                                    <StepRow key={step.id} step={step} onUpdate={(s) => updateStep(steps.indexOf(step), s)} onRemove={() => removeStep(steps.indexOf(step))} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {conditions.length > 0 && (
                    <div className="rounded-md bg-sidebar p-1">
                        <div className="rounded-md border border-sidebar-accent bg-background p-4">
                            <p className="mb-3 text-xs font-medium text-muted-foreground">Conditions</p>
                            <div className="space-y-2">
                                {conditions.map((step) => (
                                    <StepRow key={step.id} step={step} onUpdate={(s) => updateStep(steps.indexOf(step), s)} onRemove={() => removeStep(steps.indexOf(step))} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {actions.length > 0 && (
                    <div className="rounded-md bg-sidebar p-1">
                        <div className="rounded-md border border-sidebar-accent bg-background p-4">
                            <p className="mb-3 text-xs font-medium text-muted-foreground">Actions</p>
                            <div className="space-y-2">
                                {actions.map((step) => (
                                    <StepRow key={step.id} step={step} onUpdate={(s) => updateStep(steps.indexOf(step), s)} onRemove={() => removeStep(steps.indexOf(step))} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {steps.length === 0 && (
                    <div className="rounded-md bg-sidebar p-1">
                        <div className="rounded-md border border-sidebar-accent bg-background p-6">
                            <div className="rounded-xl border border-dashed border-sidebar-border/70 px-4 py-8 text-center dark:border-sidebar-border">
                                <p className="text-xs text-muted-foreground">Add a trigger to get started.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Workflow card ---

function WorkflowCard({
    workflow,
    serverId,
    onOpen,
}: {
    workflow: WorkflowEntry;
    serverId: number;
    onOpen: () => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const [toggling, setToggling] = useState(false);
    const steps = (workflow.nodes as StepData[]) ?? [];
    const triggerCount = steps.filter((s) => s.type === 'trigger').length;
    const actionCount = steps.filter((s) => s.type === 'action').length;

    const handleToggle = (enabled: boolean) => {
        setToggling(true);
        router.patch(update.url({ server: serverId, workflow: workflow.id }), { enabled }, {
            preserveScroll: true,
            onSuccess: () => toast.success(enabled ? 'Enabled.' : 'Disabled.'),
            onFinish: () => setToggling(false),
        });
    };

    const handleDelete = () => {
        setDeleting(true);
        router.delete(destroy.url({ server: serverId, workflow: workflow.id }), {
            preserveScroll: true,
            onSuccess: () => toast.success('Deleted.'),
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
            <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{workflow.name}</span>
                    {!workflow.enabled && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Off</span>
                    )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {triggerCount} trigger{triggerCount !== 1 ? 's' : ''}, {actionCount} action{actionCount !== 1 ? 's' : ''}
                </p>
            </button>
            <div className="flex items-center gap-2">
                <Switch checked={workflow.enabled} onCheckedChange={handleToggle} disabled={toggling} />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onOpen}>
                    <Pencil className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled={deleting}>
                            {deleting ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete {workflow.name}</AlertDialogTitle>
                            <AlertDialogDescription>This workflow will be permanently deleted.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
}

// --- Create dialog ---

function CreateWorkflowDialog({ serverId }: { serverId: number }) {
    const [open, setOpen] = useState(false);
    const form = useForm({ name: '' });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(store.url(serverId), {
            preserveScroll: true,
            onSuccess: () => { form.reset(); setOpen(false); toast.success('Created.'); },
            onError: (errors) => Object.values(errors).forEach((m) => toast.error(m)),
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" />New workflow</Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create workflow</DialogTitle>
                        <DialogDescription>Automate server tasks with triggers, conditions, and actions.</DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 grid gap-2">
                        <Label htmlFor="wf-name">Name</Label>
                        <Input id="wf-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="Auto-restart on crash" maxLength={255} required />
                        <InputError message={form.errors.name} />
                    </div>
                    <DialogFooter className="mt-6">
                        <Button type="submit" disabled={form.processing}>{form.processing && <Spinner />}Create</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// --- Main ---

export default function ServerWorkflows({ server, workflows }: Props) {
    const [editingId, setEditingId] = useState<number | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: home() },
        { title: server.name, href: serverConsole.url(server.id) },
        { title: 'Workflows', href: `/server/${server.id}/workflows` },
    ];

    const editing = editingId !== null ? workflows.find((w) => w.id === editingId) ?? null : null;

    if (editing) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title={`${server.name} — ${editing.name}`} />
                <WorkflowEditor key={editing.id} workflow={editing} serverId={server.id} onBack={() => setEditingId(null)} />
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${server.name} — Workflows`} />
            <div className="px-4 py-6">
                <Heading title="Workflows" description="Automate server tasks with triggers, conditions, and actions." />
                <div className="rounded-md bg-sidebar p-1">
                    <div className="rounded-md border border-sidebar-accent bg-background p-6">
                        <div className="flex items-center justify-between">
                            <Heading variant="small" title="Automations" description="Workflows run automatically based on triggers you define." />
                            <CreateWorkflowDialog serverId={server.id} />
                        </div>
                        {workflows.length > 0 ? (
                            <div className="mt-4 space-y-2">
                                {workflows.map((w) => (
                                    <WorkflowCard key={w.id} workflow={w} serverId={server.id} onOpen={() => setEditingId(w.id)} />
                                ))}
                            </div>
                        ) : (
                            <div className="mt-4 rounded-xl border border-dashed border-sidebar-border/70 px-4 py-8 text-center dark:border-sidebar-border">
                                <p className="text-xs text-muted-foreground">No workflows yet. Create one to automate your server.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
