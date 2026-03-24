import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
    impersonate,
    index as adminUsers,
    suspend,
    unsuspend,
    update,
    verifyEmail,
} from '@/actions/App/Http/Controllers/Admin/UsersController';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useInitials } from '@/hooks/use-initials';
import AdminLayout from '@/layouts/admin/layout';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, User } from '@/types';

type AdminUser = User & {
    suspended_at: string | null;
    is_admin: boolean;
    two_factor_confirmed_at: string | null;
};

type PaginationLink = {
    active: boolean;
    label: string;
    url: string | null;
};

type Props = {
    users: {
        data: AdminUser[];
        links: PaginationLink[];
        current_page: number;
        from: number | null;
        last_page: number;
        per_page: number;
        to: number | null;
        total: number;
    };
    filters: { search: string };
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: adminUsers.url() },
    { title: 'Users', href: adminUsers.url() },
];

function formatDate(value: string | null, withTime = false): string {
    if (!value) {
        return '—';
    }

    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        ...(withTime ? { timeStyle: 'short' } : {}),
    }).format(new Date(value));
}

// ─── Simple tab component ────────────────────────────────────────────────────

type Tab = { id: string; label: string };

function Tabs({
    tabs,
    active,
    onChange,
}: {
    tabs: Tab[];
    active: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="flex gap-1 border-b border-border/60">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange(tab.id)}
                    className={cn(
                        'px-4 py-2.5 text-sm font-medium transition-colors',
                        active === tab.id
                            ? 'border-b-2 border-foreground text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

// ─── Action card ─────────────────────────────────────────────────────────────

function ActionCard({
    title,
    description,
    children,
    danger,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
    danger?: boolean;
}) {
    return (
        <div
            className={cn(
                'flex items-center justify-between gap-4 rounded-lg p-4',
                danger ? 'bg-destructive/5' : 'bg-muted/30',
            )}
        >
            <div>
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {description}
                </p>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

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
    const isVerified = user.email_verified_at !== null;
    const isSelf = user.id === auth.user.id;

    const MIN_MS = 600;
    const submitStart = useRef(0);
    const [submitting, setSubmitting] = useState(false);
    const [actioning, setActioning] = useState<string | null>(null);

    const tabs: Tab[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'billing', label: 'Billing' },
        { id: 'actions', label: 'Actions' },
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
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                {/* Header */}
                <DialogHeader className="pb-0">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="rounded-full bg-neutral-200 text-lg text-black dark:bg-neutral-700 dark:text-white">
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
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {user.is_admin && (
                                    <Badge
                                        variant="secondary"
                                        className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400"
                                    >
                                        Admin
                                    </Badge>
                                )}
                                {isSuspended ? (
                                    <Badge variant="destructive">
                                        Suspended
                                    </Badge>
                                ) : (
                                    <Badge
                                        variant="secondary"
                                        className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                                    >
                                        Active
                                    </Badge>
                                )}
                                {isVerified ? (
                                    <Badge
                                        variant="secondary"
                                        className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-400"
                                    >
                                        Verified
                                    </Badge>
                                ) : (
                                    <Badge
                                        variant="outline"
                                        className="text-muted-foreground"
                                    >
                                        Unverified
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs tabs={tabs} active={tab} onChange={setTab} />

                {/* Overview tab */}
                {tab === 'overview' && (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {[
                            { label: 'User ID', value: `#${user.id}` },
                            {
                                label: 'Joined',
                                value: formatDate(user.created_at, true),
                            },
                            {
                                label: 'Email verified',
                                value: isVerified
                                    ? formatDate(user.email_verified_at, true)
                                    : 'Not verified',
                            },
                            {
                                label: 'Two-factor',
                                value: user.two_factor_confirmed_at
                                    ? `Enabled ${formatDate(user.two_factor_confirmed_at)}`
                                    : 'Disabled',
                            },
                            {
                                label: 'Registration IP',
                                value: user.registration_ip ?? '—',
                            },
                            {
                                label: 'Last seen IP',
                                value: user.last_seen_ip ?? '—',
                            },
                            {
                                label: 'Region',
                                value: user.account_region ?? '—',
                            },
                            {
                                label: 'Currency',
                                value: user.preferred_currency,
                            },
                        ].map(({ label, value }) => (
                            <div
                                key={label}
                                className="rounded-md bg-muted/30 px-3 py-2.5"
                            >
                                <p className="text-xs text-muted-foreground">
                                    {label}
                                </p>
                                <p className="text-sm font-medium text-foreground">
                                    {value}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Billing tab */}
                {tab === 'billing' && (
                    <Form
                        {...update.form(user.id)}
                        options={{ preserveScroll: true }}
                        onStart={() => {
                            submitStart.current = Date.now();
                            setSubmitting(true);
                        }}
                        onFinish={() => {
                            const rem =
                                MIN_MS - (Date.now() - submitStart.current);
                            setTimeout(
                                () => setSubmitting(false),
                                Math.max(0, rem),
                            );
                        }}
                        onSuccess={() => toast.success('Billing updated')}
                        onError={(errors) =>
                            Object.values(errors).forEach((m) => toast.error(m))
                        }
                        className="space-y-4"
                    >
                        {({ errors }) => (
                            <>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="billing-name">
                                            Name
                                        </Label>
                                        <Input
                                            id="billing-name"
                                            name="name"
                                            defaultValue={user.name}
                                            required
                                        />
                                        <InputError message={errors.name} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="billing-email">
                                            Email
                                        </Label>
                                        <Input
                                            id="billing-email"
                                            name="email"
                                            type="email"
                                            defaultValue={user.email}
                                            required
                                        />
                                        <InputError message={errors.email} />
                                    </div>
                                </div>

                                <div className="space-y-4 rounded-md bg-muted/30 p-4">
                                    <p className="text-sm font-medium text-foreground">
                                        Balances
                                    </p>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="billing-coins">
                                                Coins balance
                                            </Label>
                                            <Input
                                                id="billing-coins"
                                                name="coins_balance"
                                                type="number"
                                                min={0}
                                                defaultValue={
                                                    user.coins_balance
                                                }
                                                required
                                            />
                                            <InputError
                                                message={errors.coins_balance}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="billing-credit">
                                                Credit balance
                                                <span className="ml-1 text-xs text-muted-foreground">
                                                    (pence)
                                                </span>
                                            </Label>
                                            <Input
                                                id="billing-credit"
                                                name="credit_balance"
                                                type="number"
                                                min={0}
                                                defaultValue={
                                                    user.credit_balance
                                                }
                                                required
                                            />
                                            <InputError
                                                message={errors.credit_balance}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="billing-currency">
                                            Preferred currency
                                        </Label>
                                        <select
                                            id="billing-currency"
                                            name="preferred_currency"
                                            defaultValue={
                                                user.preferred_currency
                                            }
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        >
                                            {[
                                                'AUD',
                                                'CAD',
                                                'EUR',
                                                'GBP',
                                                'JPY',
                                                'USD',
                                            ].map((c) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError
                                            message={errors.preferred_currency}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={submitting}>
                                        {submitting && <Spinner />}
                                        Save changes
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                )}

                {/* Actions tab */}
                {tab === 'actions' && (
                    <div className="space-y-3">
                        {/* Verify email */}
                        <ActionCard
                            title="Email verification"
                            description={
                                isVerified
                                    ? `Verified on ${formatDate(user.email_verified_at, true)}`
                                    : 'This user has not verified their email address.'
                            }
                        >
                            <Form
                                {...verifyEmail.form(user.id)}
                                onStart={() => setActioning('verify')}
                                onFinish={() => setActioning(null)}
                                onSuccess={() =>
                                    toast.success('Email marked as verified')
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
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                            isVerified || actioning === 'verify'
                                        }
                                    >
                                        {actioning === 'verify' && <Spinner />}
                                        {isVerified
                                            ? 'Already verified'
                                            : 'Bypass verification'}
                                    </Button>
                                )}
                            </Form>
                        </ActionCard>

                        {/* Suspend / Unsuspend */}
                        <ActionCard
                            title={
                                isSuspended
                                    ? 'Unsuspend account'
                                    : 'Suspend account'
                            }
                            description={
                                isSuspended
                                    ? `Suspended on ${formatDate(user.suspended_at, true)}. Restoring access will allow this user to log in.`
                                    : 'Suspending this account will prevent the user from accessing the platform.'
                            }
                            danger={!isSuspended}
                        >
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
                                            isSelf || actioning === 'suspend'
                                        }
                                    >
                                        {actioning === 'suspend' && <Spinner />}
                                        {isSuspended ? 'Unsuspend' : 'Suspend'}
                                    </Button>
                                )}
                            </Form>
                        </ActionCard>

                        {/* Impersonate */}
                        <ActionCard
                            title="Impersonate user"
                            description="Log in as this user to debug issues. A banner will appear so you can stop at any time."
                            danger
                        >
                            <Form
                                {...impersonate.form(user.id)}
                                onStart={() => setActioning('impersonate')}
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
                                        variant="destructive"
                                        size="sm"
                                        disabled={
                                            isSelf ||
                                            actioning === 'impersonate'
                                        }
                                    >
                                        {actioning === 'impersonate' && (
                                            <Spinner />
                                        )}
                                        Impersonate
                                    </Button>
                                )}
                            </Form>
                        </ActionCard>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Users({ users, filters }: Props) {
    const getInitials = useInitials();
    const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);
    const [search, setSearch] = useState(filters.search);

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            adminUsers.url(),
            { search: value },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin — Users" />

            <AdminLayout
                title="Users"
                description="Manage user accounts across the platform."
            >
                <div className="space-y-4">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground">
                            {users.total.toLocaleString()}{' '}
                            {users.total === 1 ? 'user' : 'users'}
                        </p>
                        <div className="relative w-64">
                            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                                placeholder="Search users..."
                                className="pl-8 text-sm"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/40">
                                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                        User
                                    </th>
                                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                        Coins
                                    </th>
                                    <th className="px-4 py-3 text-xs font-medium text-muted-foreground">
                                        Joined
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {users.data.length > 0 ? (
                                    users.data.map((user) => {
                                        const isSuspended =
                                            user.suspended_at !== null;
                                        const isVerified =
                                            user.email_verified_at !== null;

                                        return (
                                            <tr
                                                key={user.id}
                                                className="border-b border-border/60 transition-colors last:border-0 hover:bg-muted/30"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8 shrink-0 overflow-hidden rounded-full">
                                                            <AvatarImage
                                                                src={
                                                                    user.avatar
                                                                }
                                                                alt={user.name}
                                                            />
                                                            <AvatarFallback className="rounded-full bg-neutral-200 text-xs text-black dark:bg-neutral-700 dark:text-white">
                                                                {getInitials(
                                                                    user.name,
                                                                )}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="truncate text-sm font-medium text-foreground">
                                                                    {user.name}
                                                                </p>
                                                                {user.is_admin && (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="border-violet-200 bg-violet-50 px-1 py-0 text-[10px] text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400"
                                                                    >
                                                                        Admin
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="truncate text-xs text-muted-foreground">
                                                                {user.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        {isSuspended ? (
                                                            <Badge
                                                                variant="destructive"
                                                                className="w-fit"
                                                            >
                                                                Suspended
                                                            </Badge>
                                                        ) : (
                                                            <Badge
                                                                variant="secondary"
                                                                className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                                                            >
                                                                Active
                                                            </Badge>
                                                        )}
                                                        {!isVerified && (
                                                            <span className="text-[11px] text-amber-600 dark:text-amber-400">
                                                                Unverified email
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                                    {user.coins_balance.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground">
                                                    {formatDate(
                                                        user.created_at,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-3 text-xs"
                                                            onClick={() =>
                                                                setViewingUser(
                                                                    user,
                                                                )
                                                            }
                                                        >
                                                            View
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-12 text-center"
                                        >
                                            <p className="text-sm font-medium text-foreground">
                                                No users found
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {filters.search
                                                    ? 'Try a different search term.'
                                                    : 'Users will appear here.'}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {users.last_page > 1 && (
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {users.from ?? 0}–{users.to ?? 0} of{' '}
                                {users.total.toLocaleString()}
                            </p>
                            <nav
                                className="flex flex-wrap items-center gap-2"
                                aria-label="Users pagination"
                            >
                                {users.links.map((link, index) => (
                                    <Link
                                        key={`${link.label}-${index}`}
                                        href={link.url ?? '#'}
                                        preserveScroll
                                        className={cn(
                                            'rounded-md border px-3 py-2 text-sm transition-colors',
                                            link.active
                                                ? 'border-transparent bg-foreground text-background'
                                                : 'border-border/80 bg-background hover:bg-muted',
                                            link.url === null
                                                ? 'pointer-events-none opacity-40'
                                                : null,
                                        )}
                                    >
                                        <span
                                            dangerouslySetInnerHTML={{
                                                __html: link.label,
                                            }}
                                        />
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    )}
                </div>
            </AdminLayout>

            {viewingUser && (
                <UserModal
                    user={viewingUser}
                    onClose={() => setViewingUser(null)}
                />
            )}
        </AppLayout>
    );
}
