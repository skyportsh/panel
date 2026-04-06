import { Head, Link } from '@inertiajs/react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { index as adminDashboard } from '@/actions/App/Http/Controllers/Admin/DashboardController';
import { index as adminNodes } from '@/actions/App/Http/Controllers/Admin/NodesController';
import { index as adminServers } from '@/actions/App/Http/Controllers/Admin/ServersController';
import { index as adminUsers } from '@/actions/App/Http/Controllers/Admin/UsersController';
import AdminLayout from '@/layouts/admin/layout';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type ChartPoint = {
    day: string;
    amount: number;
};

type NodeInfo = {
    name: string;
    fqdn: string;
    status: string;
    servers_count: number;
    allocations_count: number;
    last_seen_at: string | null;
};

type Props = {
    recentUsers: ChartPoint[];
    recentUsersTotal: number;
    recentServers: ChartPoint[];
    recentServersTotal: number;
    nodes: NodeInfo[];
    totalServers: number;
    totalNodes: number;
    totalUsers: number;
    totalMemoryMib: number;
    totalDiskMib: number;
    version: string;
};

function ChartTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean;
    payload?: { payload: ChartPoint }[];
    label?: string;
}) {
    if (!active || !payload?.length) {
        return null;
    }

    const { day, amount } = payload[0].payload;

    return (
        <div className="rounded-md border border-sidebar-accent bg-background px-2.5 py-1.5 shadow-md">
            <p className="text-xs font-medium text-foreground">
                {amount} {label ?? 'items'}
            </p>
            <p className="text-xs text-muted-foreground">{day}</p>
        </div>
    );
}

function ChartCard({
    title,
    subtitle,
    total,
    totalLabel,
    data,
    tooltipUnit,
    color,
    gradientId,
    footerText,
    footerLink,
    footerLinkLabel,
}: {
    title: string;
    subtitle: string;
    total: number;
    totalLabel: string;
    data: ChartPoint[];
    tooltipUnit: string;
    color: string;
    gradientId: string;
    footerText: string;
    footerLink: string;
    footerLinkLabel: string;
}) {
    return (
        <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
            <div className="relative flex h-full flex-col justify-between p-2">
                <div className="grow space-y-3">
                    <div className="flex h-full flex-col gap-1 rounded-md bg-sidebar p-1">
                        <div className="relative flex grow flex-col justify-between overflow-hidden rounded-md border border-sidebar-accent bg-background p-4">
                            <div className="absolute inset-x-0 bottom-0 z-10 h-1/3 bg-gradient-to-t from-background to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 h-2/4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart
                                        data={data}
                                        margin={{
                                            top: 0,
                                            right: 0,
                                            left: 0,
                                            bottom: 0,
                                        }}
                                    >
                                        <defs>
                                            <linearGradient
                                                id={gradientId}
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >
                                                <stop
                                                    offset="0%"
                                                    stopColor={color}
                                                    stopOpacity="0.3"
                                                />
                                                <stop
                                                    offset="100%"
                                                    stopColor={color}
                                                    stopOpacity="0"
                                                />
                                            </linearGradient>
                                        </defs>
                                        <Tooltip
                                            content={
                                                <ChartTooltip
                                                    label={tooltipUnit}
                                                />
                                            }
                                            cursor={{
                                                stroke: color,
                                                strokeWidth: 1,
                                                strokeDasharray: '4 4',
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="amount"
                                            stroke={color}
                                            strokeWidth={2}
                                            fill={`url(#${gradientId})`}
                                            dot={false}
                                            activeDot={{
                                                r: 4,
                                                fill: color,
                                                stroke: color,
                                                strokeWidth: 0,
                                            }}
                                            isAnimationActive
                                            animationDuration={800}
                                            animationEasing="ease-out"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="relative">
                                <h1 className="text-md font-semibold tracking-tight text-foreground">
                                    {title}
                                </h1>
                                <span className="text-xs text-muted-foreground">
                                    {subtitle}
                                </span>
                            </div>
                            <span className="relative z-20 text-sm font-semibold text-foreground">
                                {total} {totalLabel}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="pl-2 text-xs font-medium text-muted-foreground">
                                {footerText}
                            </span>
                            <Link
                                href={footerLink}
                                className="rounded-md border border-sidebar-accent bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-sidebar-accent"
                            >
                                {footerLinkLabel}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    sub,
}: {
    label: string;
    value: string | number;
    sub?: string;
}) {
    return (
        <div className="relative overflow-hidden rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
            <div className="p-2">
                <div className="flex flex-col gap-1 rounded-md bg-sidebar p-1">
                    <div className="rounded-md border border-sidebar-accent bg-background p-4">
                        <span className="text-xs text-muted-foreground">
                            {label}
                        </span>
                        <p className="text-2xl font-semibold tracking-tight text-foreground">
                            {value}
                        </p>
                        {sub && (
                            <span className="text-xs text-muted-foreground">
                                {sub}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function NodeStatusDot({ status }: { status: string }) {
    const color =
        status === 'online'
            ? 'bg-emerald-500'
            : status === 'offline'
              ? 'bg-red-500'
              : 'bg-yellow-500';

    return (
        <span className="relative flex h-2 w-2">
            {status === 'online' && (
                <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-75`}
                />
            )}
            <span
                className={`relative inline-flex h-2 w-2 rounded-full ${color}`}
            />
        </span>
    );
}

function formatMib(mib: number): string {
    if (mib >= 1024) {
        return `${(mib / 1024).toFixed(1)} GB`;
    }

    return `${mib} MB`;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin',
        href: adminDashboard.url(),
    },
    {
        title: 'Overview',
        href: adminDashboard.url(),
    },
];

export default function AdminDashboard({
    recentUsers,
    recentUsersTotal,
    recentServers,
    recentServersTotal,
    nodes,
    totalServers,
    totalNodes,
    totalUsers,
    totalMemoryMib,
    totalDiskMib,
    version,
}: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin — Overview" />

            <AdminLayout
                title="Overview"
                description="Monitor platform activity, resource usage, and node health."
            >
                <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                            <div className="flex h-full flex-col p-2">
                                <div className="flex flex-1 rounded-md bg-sidebar p-1">
                                    <div className="flex flex-1 flex-col justify-center rounded-md border border-sidebar-accent bg-background p-4">
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Your panel is up to date
                                        </h2>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            You are currently running{' '}
                                            <span className="font-mono font-medium text-foreground">
                                                {version}
                                            </span>
                                            . Your panel is up-to-date!
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                            <div className="flex h-full flex-col p-2">
                                <div className="flex flex-1 rounded-md bg-sidebar p-1">
                                    <div className="flex flex-1 flex-col rounded-md border border-sidebar-accent bg-background p-4">
                                        <h2 className="text-sm font-semibold text-foreground">
                                            Need help?
                                        </h2>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Check out the documentation
                                            first! If you still need help,
                                            head on over to our Discord
                                            server.
                                        </p>
                                        <div className="mt-3 flex gap-2">
                                            <a
                                                href="https://docs.skyport.dev"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="rounded-md border border-sidebar-accent bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-sidebar-accent"
                                            >
                                                Read documentation
                                            </a>
                                            <a
                                                href="https://discord.gg/skyport"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="rounded-md border border-sidebar-accent bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-sidebar-accent"
                                            >
                                                Join Discord
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                        <ChartCard
                            title="Recent user growth"
                            subtitle="Last 30 days of registrations"
                            total={recentUsersTotal}
                            totalLabel={
                                recentUsersTotal === 1
                                    ? 'new account'
                                    : 'new accounts'
                            }
                            data={recentUsers}
                            tooltipUnit={
                                recentUsersTotal === 1 ? 'user' : 'users'
                            }
                            color="#0ea5e9"
                            gradientId="adminUserGradient"
                            footerText="Signups are steady"
                            footerLink={adminUsers.url()}
                            footerLinkLabel="Manage users"
                        />
                        <ChartCard
                            title="Server creation"
                            subtitle="Last 30 days of new servers"
                            total={recentServersTotal}
                            totalLabel={
                                recentServersTotal === 1
                                    ? 'new server'
                                    : 'new servers'
                            }
                            data={recentServers}
                            tooltipUnit={
                                recentServersTotal === 1 ? 'server' : 'servers'
                            }
                            color="#a855f7"
                            gradientId="adminServerGradient"
                            footerText="Provisioning on track"
                            footerLink={adminServers.url()}
                            footerLinkLabel="Manage servers"
                        />
                        <div className="grid grid-rows-2 gap-4">
                            <StatCard
                                label="Total users"
                                value={totalUsers}
                            />
                            <StatCard
                                label="Total servers"
                                value={totalServers}
                            />
                        </div>
                    </div>

                    <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                        <StatCard
                            label="Nodes"
                            value={totalNodes}
                            sub={`${nodes.filter((n) => n.status === 'online').length} online`}
                        />
                        <StatCard
                            label="Memory allocated"
                            value={formatMib(totalMemoryMib)}
                            sub="Across all servers"
                        />
                        <StatCard
                            label="Disk allocated"
                            value={formatMib(totalDiskMib)}
                            sub="Across all servers"
                        />
                    </div>

                    {nodes.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                            <div className="p-2">
                                <div className="rounded-md bg-sidebar p-1">
                                    <div className="rounded-md border border-sidebar-accent bg-background">
                                        <div className="flex items-center justify-between border-b border-sidebar-accent px-4 py-3">
                                            <h2 className="text-sm font-semibold text-foreground">
                                                Node health
                                            </h2>
                                            <Link
                                                href={adminNodes.url()}
                                                className="rounded-md border border-sidebar-accent bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-sidebar-accent"
                                            >
                                                Manage nodes
                                            </Link>
                                        </div>
                                        <div className="divide-y divide-sidebar-accent">
                                            {nodes.map((node) => (
                                                <div
                                                    key={node.fqdn}
                                                    className="flex items-center gap-3 px-4 py-3"
                                                >
                                                    <NodeStatusDot
                                                        status={node.status}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-foreground">
                                                            {node.name}
                                                        </p>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {node.fqdn}
                                                        </p>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                                                        <span>
                                                            {
                                                                node.servers_count
                                                            }{' '}
                                                            {node.servers_count ===
                                                            1
                                                                ? 'server'
                                                                : 'servers'}
                                                        </span>
                                                        <span>
                                                            {
                                                                node.allocations_count
                                                            }{' '}
                                                            {node.allocations_count ===
                                                            1
                                                                ? 'allocation'
                                                                : 'allocations'}
                                                        </span>
                                                        {node.last_seen_at && (
                                                            <span className="hidden sm:inline">
                                                                Seen{' '}
                                                                {
                                                                    node.last_seen_at
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </AdminLayout>
        </AppLayout>
    );
}
