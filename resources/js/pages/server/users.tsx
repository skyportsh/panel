import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    destroy,
    store,
    update,
} from '@/actions/App/Http/Controllers/Client/ServerUsersController';
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
import { Checkbox } from '@/components/ui/checkbox';
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

type SubuserEntry = {
    id: number;
    user: {
        id: number;
        name: string;
        email: string;
    };
    permissions: string[];
    created_at: string | null;
};

type Props = {
    server: {
        id: number;
        name: string;
        status: string;
        user_id: number;
    };
    subusers: SubuserEntry[];
    availablePermissions: string[];
    isOwner: boolean;
    canManage: boolean;
};

const permissionLabels: Record<string, { label: string; description: string }> =
    {
        console: {
            label: 'Console',
            description: 'View console output and send commands.',
        },
        files: {
            label: 'Files',
            description: 'Browse, edit, upload, and delete files.',
        },
        power: {
            label: 'Power',
            description: 'Start, stop, restart, and kill the server.',
        },
        settings: {
            label: 'Settings',
            description: 'Change server name and startup configuration.',
        },
        allocations: {
            label: 'Allocations',
            description: 'Manage port allocations.',
        },
        firewall: {
            label: 'Firewall',
            description: 'Create and delete firewall rules.',
        },
        users: {
            label: 'Users',
            description: 'Add, edit, and remove subusers.',
        },
    };

function PermissionCheckboxes({
    available,
    selected,
    onChange,
}: {
    available: string[];
    selected: string[];
    onChange: (permissions: string[]) => void;
}) {
    const allSelected = available.every((p) => selected.includes(p));

    const toggleAll = () => {
        onChange(allSelected ? [] : [...available]);
    };

    const toggle = (permission: string) => {
        if (selected.includes(permission)) {
            onChange(selected.filter((p) => p !== permission));
        } else {
            onChange([...selected, permission]);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                <Checkbox
                    id="select-all"
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                />
                <Label
                    htmlFor="select-all"
                    className="cursor-pointer text-sm font-medium"
                >
                    Select all permissions
                </Label>
            </div>
            <div className="grid gap-2">
                {available.map((permission) => {
                    const info = permissionLabels[permission];

                    return (
                        <div
                            key={permission}
                            className="flex items-start gap-2.5"
                        >
                            <Checkbox
                                id={`perm-${permission}`}
                                checked={selected.includes(permission)}
                                onCheckedChange={() => toggle(permission)}
                                className="mt-0.5"
                            />
                            <label
                                htmlFor={`perm-${permission}`}
                                className="cursor-pointer"
                            >
                                <p className="text-sm font-medium text-foreground">
                                    {info?.label ?? permission}
                                </p>
                                {info?.description && (
                                    <p className="text-xs text-muted-foreground">
                                        {info.description}
                                    </p>
                                )}
                            </label>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function AddUserDialog({
    serverId,
    availablePermissions,
}: {
    serverId: number;
    availablePermissions: string[];
}) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        email: '',
        permissions: [...availablePermissions],
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.post(store.url(serverId), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
                toast.success('User added.');
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
                    Add user
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add user</DialogTitle>
                        <DialogDescription>
                            Invite someone to this server by their email
                            address. They must already have a panel account.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.data.email}
                                onChange={(event) =>
                                    form.setData('email', event.target.value)
                                }
                                placeholder="user@example.com"
                                required
                            />
                            <InputError message={form.errors.email} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Permissions</Label>
                            <PermissionCheckboxes
                                available={availablePermissions}
                                selected={form.data.permissions}
                                onChange={(permissions) =>
                                    form.setData('permissions', permissions)
                                }
                            />
                            <InputError message={form.errors.permissions} />
                        </div>
                    </div>
                    <DialogFooter className="mt-6">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}
                            Add user
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function EditPermissionsDialog({
    subuser,
    serverId,
    availablePermissions,
}: {
    subuser: SubuserEntry;
    serverId: number;
    availablePermissions: string[];
}) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        permissions: [...subuser.permissions],
    });

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.patch(update.url({ server: serverId, serverUser: subuser.id }), {
            preserveScroll: true,
            onSuccess: () => {
                form.setDefaults();
                setOpen(false);
                toast.success('Permissions updated.');
            },
            onError: (errors) =>
                Object.values(errors).forEach((m) => toast.error(m)),
        });
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
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Edit permissions</TooltipContent>
            </Tooltip>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>
                            Edit {subuser.user.name}'s permissions
                        </DialogTitle>
                        <DialogDescription>
                            Choose what {subuser.user.name} can do on this
                            server.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                        <PermissionCheckboxes
                            available={availablePermissions}
                            selected={form.data.permissions}
                            onChange={(permissions) =>
                                form.setData('permissions', permissions)
                            }
                        />
                        <InputError message={form.errors.permissions} />
                    </div>
                    <DialogFooter className="mt-6">
                        <Button
                            type="submit"
                            disabled={form.processing || !form.isDirty}
                        >
                            {form.processing && <Spinner />}
                            Save permissions
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function SubuserCard({
    subuser,
    serverId,
    availablePermissions,
    canManage,
}: {
    subuser: SubuserEntry;
    serverId: number;
    availablePermissions: string[];
    canManage: boolean;
}) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = () => {
        setDeleting(true);
        router.delete(
            destroy.url({ server: serverId, serverUser: subuser.id }),
            {
                preserveScroll: true,
                onSuccess: () => toast.success('User removed.'),
                onError: (errors) =>
                    Object.values(errors).forEach((m) => toast.error(m)),
                onFinish: () => setDeleting(false),
            },
        );
    };

    const initial = (subuser.user.name || subuser.user.email)
        .charAt(0)
        .toUpperCase();

    return (
        <div className="group relative flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-1 py-1">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background text-muted-foreground shadow-xs ring-1 ring-border/60">
                <PlaceholderPattern
                    patternSize={4}
                    className="pointer-events-none absolute inset-0 size-full stroke-current opacity-[0.12]"
                />
                <span className="relative text-sm font-semibold">
                    {initial}
                </span>
            </div>
            <div className="min-w-0 flex-1 pl-2">
                <p className="text-sm font-medium text-foreground">
                    {subuser.user.name}
                </p>
                <p className="text-xs text-muted-foreground">
                    {subuser.user.email}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                    {subuser.permissions.map((perm) => (
                        <span
                            key={perm}
                            className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                        >
                            {permissionLabels[perm]?.label ?? perm}
                        </span>
                    ))}
                </div>
            </div>
            {canManage && (
                <div className="flex items-center gap-1 pr-2">
                    <EditPermissionsDialog
                        subuser={subuser}
                        serverId={serverId}
                        availablePermissions={availablePermissions}
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
                            <TooltipContent>Remove user</TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    Remove {subuser.user.name}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will revoke all access for{' '}
                                    {subuser.user.name} on this server.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete}>
                                    Remove
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            )}
        </div>
    );
}

export default function ServerUsers({
    server,
    subusers,
    availablePermissions,
    isOwner,
    canManage,
}: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Home', href: home() },
        { title: server.name, href: serverConsole.url(server.id) },
        { title: 'Users', href: `/server/${server.id}/users` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${server.name} — Users`} />

            <div className="px-4 py-6">
                <Heading
                    title="Users"
                    description="Manage who has access to this server and what they can do."
                />

                <div className="space-y-4">
                    <div className="rounded-md bg-sidebar p-1">
                        <div className="rounded-md border border-sidebar-accent bg-background p-6">
                            <div className="flex items-center justify-between">
                                <Heading
                                    variant="small"
                                    title="Subusers"
                                    description={
                                        isOwner
                                            ? 'People you have given access to this server.'
                                            : canManage
                                              ? "You're managing this server's users as an admin."
                                              : "You're viewing this server's users."
                                    }
                                />
                                {canManage && (
                                    <AddUserDialog
                                        serverId={server.id}
                                        availablePermissions={
                                            availablePermissions
                                        }
                                    />
                                )}
                            </div>

                            {subusers.length > 0 ? (
                                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                    {subusers.map((subuser) => (
                                        <SubuserCard
                                            key={subuser.id}
                                            subuser={subuser}
                                            serverId={server.id}
                                            availablePermissions={
                                                availablePermissions
                                            }
                                            canManage={canManage}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-4 rounded-xl border border-dashed border-sidebar-border/70 px-4 py-6 text-center dark:border-sidebar-border">
                                    <p className="text-xs text-muted-foreground">
                                        No users have been added to this server
                                        yet.
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
