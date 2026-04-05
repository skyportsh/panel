import { Form, Head, router, usePage } from '@inertiajs/react';
import {
    Crown,
    Ellipsis,
    Lock,
    LockOpen,
    Plus,
    Trash2,
    UserRoundCog,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from '@/components/ui/sonner';
import {
    destroy,
    impersonate,
    index as adminUsers,
    store,
    suspend,
    unsuspend,
    update,
} from '@/actions/App/Http/Controllers/Admin/UsersController';
import { bulkDestroy } from '@/actions/App/Http/Controllers/Admin/UsersController';
import { ConfirmDeleteDialog, DataTable } from '@/components/admin/data-table';
import type { Column, PaginatedData } from '@/components/admin/data-table';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogContentFull,
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
import { SlidingTabs } from '@/components/ui/sliding-tabs';
import type { Tab } from '@/components/ui/sliding-tabs';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useInitials } from '@/hooks/use-initials';
import AdminLayout from '@/layouts/admin/layout';
import AppLayout from '@/layouts/app-layout';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, User } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type AdminUser = User & {
    suspended_at: string | null;
    is_admin: boolean;
    two_factor_confirmed_at: string | null;
};

type Props = {
    users: PaginatedData<AdminUser>;
    filters: { search: string; admin_only: boolean };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: adminUsers.url() },
    { title: 'Users', href: adminUsers.url() },
];

// ─── User detail modal ────────────────────────────────────────────────────────

function UserModal({
    user,
    onClose,
}: {
    user: AdminUser;
    onClose: () => void;
}) {
    const { auth } = usePage().props;
    const getInitials = useInitials();
    const [tab, setTab] = useState('overview');
    const isSuspended = user.suspended_at !== null;
    const isSelf = user.id === auth.user.id;

    const MIN_MS = 600;
    const submitStart = useRef(0);
    const [submitting, setSubmitting] = useState(false);
    const passwordStart = useRef(0);
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);
    const [actioning, setActioning] = useState<string | null>(null);

    const tabs: Tab[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'edit', label: 'Edit' },
        { id: 'danger', label: 'Danger' },
    ];

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContentFull>
                {/* Header */}
                <div className="px-8 pt-8 pb-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="rounded bg-neutral-200 text-base text-black dark:bg-neutral-700 dark:text-white">
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-lg">
                                {user.name}
                            </DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                {user.email}
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
                    {/* Overview tab */}
                    {tab === 'overview' && (
                        <div className="flex gap-6">
                            {/* Left — user info list */}
                            <div className="min-w-0 flex-1 space-y-1">
                                {[
                                    { label: 'User ID', value: `#${user.id}` },
                                    { label: 'Name', value: user.name },
                                    { label: 'Email', value: user.email },
                                    {
                                        label: 'Role',
                                        value: user.is_admin
                                            ? 'Administrator'
                                            : 'User',
                                    },
                                    {
                                        label: 'Joined',
                                        value: formatDate(
                                            user.created_at,
                                            true,
                                        ),
                                    },
                                    {
                                        label: 'Last updated',
                                        value: formatDate(
                                            user.updated_at,
                                            true,
                                        ),
                                    },
                                    {
                                        label: 'Two-factor',
                                        value: user.two_factor_confirmed_at
                                            ? `Enabled ${formatDate(user.two_factor_confirmed_at)}`
                                            : 'Disabled',
                                    },
                                ].map(({ label, value }) => (
                                    <div
                                        key={label}
                                        className="flex items-center justify-between rounded-md px-3 py-2.5"
                                    >
                                        <span className="text-sm text-muted-foreground">
                                            {label}
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {value}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Right — stat cards (table style) */}
                            <div className="w-[300px] shrink-0 space-y-3">
                                {/* Status card */}
                                <div className="overflow-hidden rounded-lg bg-muted/40">
                                    <div className="px-4 py-2.5">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Status
                                        </span>
                                    </div>
                                    <div className="rounded-lg border border-border/70 bg-background p-5">
                                        <p
                                            className={cn(
                                                'text-3xl font-semibold',
                                                isSuspended
                                                    ? 'text-destructive'
                                                    : 'text-emerald-600 dark:text-emerald-400',
                                            )}
                                        >
                                            {isSuspended
                                                ? 'Suspended'
                                                : 'Active'}
                                        </p>
                                        {isSuspended && user.suspended_at && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Since{' '}
                                                {formatDate(
                                                    user.suspended_at,
                                                    true,
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Servers card */}
                                <div className="overflow-hidden rounded-lg bg-muted/40">
                                    <div className="px-4 py-2.5">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Servers
                                        </span>
                                    </div>
                                    <div className="rounded-lg border border-border/70 bg-background p-5">
                                        <p className="text-3xl font-semibold text-foreground">
                                            0
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit tab */}
                    {tab === 'edit' && (
                        <div className="grid grid-cols-2 gap-8">
                            {/* Update profile */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    Profile
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Update this user's name and email address.
                                </p>
                                <Form
                                    {...update.form(user.id)}
                                    options={{ preserveScroll: true }}
                                    onStart={() => {
                                        submitStart.current = Date.now();
                                        setSubmitting(true);
                                    }}
                                    onFinish={() => {
                                        const rem =
                                            MIN_MS -
                                            (Date.now() - submitStart.current);
                                        setTimeout(
                                            () => setSubmitting(false),
                                            Math.max(0, rem),
                                        );
                                    }}
                                    onSuccess={() =>
                                        toast.success('Profile updated')
                                    }
                                    onError={(errors) =>
                                        Object.values(errors).forEach((m) =>
                                            toast.error(m),
                                        )
                                    }
                                    className="mt-4 space-y-4"
                                >
                                    {({ errors }) => (
                                        <>
                                            <div className="grid gap-2">
                                                <Label htmlFor="edit-name">
                                                    Name
                                                </Label>
                                                <Input
                                                    id="edit-name"
                                                    name="name"
                                                    defaultValue={user.name}
                                                    required
                                                />
                                                <InputError
                                                    message={errors.name}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="edit-email">
                                                    Email
                                                </Label>
                                                <Input
                                                    id="edit-email"
                                                    name="email"
                                                    type="email"
                                                    defaultValue={user.email}
                                                    required
                                                />
                                                <InputError
                                                    message={errors.email}
                                                />
                                            </div>
                                            <div className="flex justify-end">
                                                <Button
                                                    type="submit"
                                                    disabled={submitting}
                                                >
                                                    {submitting && <Spinner />}
                                                    Save profile
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </Form>
                            </div>

                            {/* Update password */}
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    Password
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Set a new password for this user.
                                </p>
                                <Form
                                    {...update.form(user.id)}
                                    options={{ preserveScroll: true }}
                                    onStart={() => {
                                        passwordStart.current = Date.now();
                                        setPasswordSubmitting(true);
                                    }}
                                    onFinish={() => {
                                        const rem =
                                            MIN_MS -
                                            (Date.now() -
                                                passwordStart.current);
                                        setTimeout(
                                            () => setPasswordSubmitting(false),
                                            Math.max(0, rem),
                                        );
                                    }}
                                    onSuccess={() =>
                                        toast.success('Password updated')
                                    }
                                    onError={(errors) =>
                                        Object.values(errors).forEach((m) =>
                                            toast.error(m),
                                        )
                                    }
                                    className="mt-4 space-y-4"
                                >
                                    {({ errors }) => (
                                        <>
                                            <div className="grid gap-2">
                                                <Label htmlFor="edit-password">
                                                    New password
                                                </Label>
                                                <Input
                                                    id="edit-password"
                                                    name="password"
                                                    type="password"
                                                    placeholder="Minimum 8 characters"
                                                />
                                                <InputError
                                                    message={errors.password}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="edit-password-confirm">
                                                    Confirm password
                                                </Label>
                                                <Input
                                                    id="edit-password-confirm"
                                                    name="password_confirmation"
                                                    type="password"
                                                    placeholder="Repeat password"
                                                />
                                            </div>
                                            <div className="flex justify-end">
                                                <Button
                                                    type="submit"
                                                    disabled={
                                                        passwordSubmitting
                                                    }
                                                >
                                                    {passwordSubmitting && (
                                                        <Spinner />
                                                    )}
                                                    Update password
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </Form>
                            </div>
                        </div>
                    )}

                    {/* Danger tab */}
                    {tab === 'danger' && (
                        <div className="space-y-3">
                            {/* Suspend / Unsuspend */}
                            <div className="overflow-hidden rounded-lg bg-muted/40">
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        {isSuspended
                                            ? 'Unsuspend account'
                                            : 'Suspend account'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background p-4">
                                    <p className="text-sm text-muted-foreground">
                                        {isSuspended
                                            ? 'Allow this user to access the platform again.'
                                            : 'Prevent this user from logging in.'}
                                    </p>
                                    <Form
                                        {...(isSuspended
                                            ? unsuspend.form(user.id)
                                            : suspend.form(user.id))}
                                        onStart={() => setActioning('suspend')}
                                        onFinish={() => setActioning(null)}
                                        onSuccess={() =>
                                            toast.success(
                                                isSuspended
                                                    ? 'User unsuspended'
                                                    : 'User suspended',
                                            )
                                        }
                                        onError={(errors) =>
                                            Object.values(errors).forEach((m) =>
                                                toast.error(m),
                                            )
                                        }
                                    >
                                        {() => (
                                            <Button
                                                type="submit"
                                                variant={
                                                    isSuspended
                                                        ? 'outline'
                                                        : 'destructive'
                                                }
                                                size="sm"
                                                disabled={
                                                    isSelf ||
                                                    actioning === 'suspend'
                                                }
                                            >
                                                {actioning === 'suspend' && (
                                                    <Spinner />
                                                )}
                                                {isSuspended
                                                    ? 'Unsuspend'
                                                    : 'Suspend'}
                                            </Button>
                                        )}
                                    </Form>
                                </div>
                            </div>

                            {/* Impersonate */}
                            <div className="overflow-hidden rounded-lg bg-muted/40">
                                <div className="flex items-center justify-between px-4 py-2.5">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Impersonate user
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-background p-4">
                                    <p className="text-sm text-muted-foreground">
                                        Log in as this user to debug issues.
                                    </p>
                                    <Form
                                        {...impersonate.form(user.id)}
                                        onStart={() =>
                                            setActioning('impersonate')
                                        }
                                        onFinish={() => setActioning(null)}
                                        onError={(errors) =>
                                            Object.values(errors).forEach((m) =>
                                                toast.error(m),
                                            )
                                        }
                                    >
                                        {() => (
                                            <Button
                                                type="submit"
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    isSelf ||
                                                    actioning === 'impersonate'
                                                }
                                            >
                                                {actioning ===
                                                    'impersonate' && (
                                                    <Spinner />
                                                )}
                                                Impersonate
                                            </Button>
                                        )}
                                    </Form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContentFull>
        </Dialog>
    );
}

// ─── Create user modal ────────────────────────────────────────────────────────

function CreateUserModal({ onClose }: { onClose: () => void }) {
    const MIN_MS = 600;
    const submitStart = useRef(0);
    const [submitting, setSubmitting] = useState(false);

    return (
        <Dialog
            open
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create user</DialogTitle>
                </DialogHeader>

                <Form
                    {...store.form()}
                    options={{ preserveScroll: true }}
                    onStart={() => {
                        submitStart.current = Date.now();
                        setSubmitting(true);
                    }}
                    onFinish={() => {
                        const rem = MIN_MS - (Date.now() - submitStart.current);
                        setTimeout(
                            () => setSubmitting(false),
                            Math.max(0, rem),
                        );
                    }}
                    onSuccess={() => {
                        toast.success('User created');
                        onClose();
                    }}
                    onError={(errors) =>
                        Object.values(errors).forEach((m) => toast.error(m))
                    }
                    className="space-y-4"
                >
                    {({ errors }) => (
                        <>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="create-name">Name</Label>
                                    <Input
                                        id="create-name"
                                        name="name"
                                        placeholder="John Doe"
                                        required
                                        autoFocus
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-email">Email</Label>
                                    <Input
                                        id="create-email"
                                        name="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        required
                                    />
                                    <InputError message={errors.email} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-password">
                                        Password
                                    </Label>
                                    <Input
                                        id="create-password"
                                        name="password"
                                        type="password"
                                        placeholder="Minimum 8 characters"
                                        required
                                    />
                                    <InputError message={errors.password} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="create-admin">
                                            Administrator
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Grant full admin access
                                        </p>
                                    </div>
                                    <Switch
                                        id="create-admin"
                                        name="is_admin"
                                        value="1"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={submitting}>
                                    {submitting && <Spinner />}
                                    Create user
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Users({ users, filters }: Props) {
    const { auth } = usePage().props;
    const getInitials = useInitials();
    const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);
    const [creatingUser, setCreatingUser] = useState(false);
    const [search, setSearch] = useState(filters.search);
    const [adminOnly, setAdminOnly] = useState(filters.admin_only);
    const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
    const [singleDeleting, setSingleDeleting] = useState(false);

    const navigate = (params: Record<string, string | boolean | undefined>) => {
        router.get(adminUsers.url(), params as Record<string, string>, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        navigate({ search: value, admin_only: adminOnly || undefined });
    };

    const toggleAdminOnly = () => {
        const next = !adminOnly;
        setAdminOnly(next);
        navigate({ search, admin_only: next || undefined });
    };

    const columns: Column<AdminUser>[] = [
        {
            label: 'User',
            width: 'w-[45%]',
            render: (user) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-7 w-7 shrink-0 overflow-hidden rounded">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback className="rounded-lg bg-neutral-200 text-xs text-black dark:bg-neutral-700 dark:text-white">
                            {getInitials(user.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="truncate text-sm font-medium text-foreground">
                                {user.name}
                            </p>
                            {user.is_admin && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleAdminOnly();
                                            }}
                                            className="-m-1.5 cursor-pointer rounded-md p-1.5 transition-transform duration-150 ease-out hover:bg-yellow-500/10 active:scale-90 active:duration-0"
                                        >
                                            <Crown
                                                className={cn(
                                                    'h-3.5 w-3.5 shrink-0 text-yellow-500',
                                                    adminOnly && 'fill-current',
                                                )}
                                            />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {adminOnly
                                            ? 'Show all users'
                                            : 'Filter admins'}
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            label: 'Last updated',
            width: 'w-[20%]',
            render: (user) => (
                <div className="text-xs text-muted-foreground">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-default">
                                {formatRelativeTime(user.updated_at)}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent>
                            {formatDate(user.updated_at, true)}
                        </TooltipContent>
                    </Tooltip>
                </div>
            ),
        },
        {
            label: '2FA',
            width: 'flex-1',
            render: (user) => (
                <div className="flex items-center">
                    {user.two_factor_confirmed_at ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Lock className="h-3.5 w-3.5 text-emerald-500" />
                            </TooltipTrigger>
                            <TooltipContent>2FA enabled</TooltipContent>
                        </Tooltip>
                    ) : (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <LockOpen className="h-3.5 w-3.5 text-muted-foreground/50" />
                            </TooltipTrigger>
                            <TooltipContent>2FA disabled</TooltipContent>
                        </Tooltip>
                    )}
                </div>
            ),
        },
    ];

    const rowMenu = (user: AdminUser) => {
        const isSelf = user.id === auth.user.id;

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all duration-150 ease-out hover:bg-muted hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
                    >
                        <Ellipsis className="h-4 w-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                        disabled={isSelf}
                        className="cursor-pointer"
                        onSelect={() => {
                            router.post(impersonate.url(user.id));
                        }}
                    >
                        <UserRoundCog className="mr-2 h-4 w-4" />
                        Impersonate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={isSelf}
                        className="cursor-pointer"
                        onSelect={() => setDeletingUser(user)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin — Users" />

            <AdminLayout
                title="Users"
                description="Manage user accounts across the platform."
            >
                <DataTable
                    data={users}
                    columns={columns}
                    searchValue={search}
                    onSearch={handleSearch}
                    onRowClick={setViewingUser}
                    rowMenu={rowMenu}
                    bulkDeleteUrl={bulkDestroy.url()}
                    entityName="user"
                    emptyMessage="No users found"
                    actions={
                        <Button
                            size="table"
                            onClick={() => setCreatingUser(true)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Create new
                        </Button>
                    }
                />
            </AdminLayout>

            {viewingUser && (
                <UserModal
                    user={viewingUser}
                    onClose={() => setViewingUser(null)}
                />
            )}

            {creatingUser && (
                <CreateUserModal onClose={() => setCreatingUser(false)} />
            )}

            <ConfirmDeleteDialog
                open={deletingUser !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingUser(null);
                    }
                }}
                title={`Delete ${deletingUser?.name}?`}
                description="This action cannot be undone. This account will be permanently removed."
                loading={singleDeleting}
                onConfirm={() => {
                    if (!deletingUser) {
                        return;
                    }
                    setSingleDeleting(true);
                    router.delete(destroy.url(deletingUser.id), {
                        onSuccess: () => {
                            toast.success(`${deletingUser.name} deleted`);
                            setDeletingUser(null);
                        },
                        onFinish: () => setSingleDeleting(false),
                    });
                }}
            />
        </AppLayout>
    );
}
