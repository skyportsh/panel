import { Head, Link } from '@inertiajs/react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { index as adminDashboard } from '@/actions/App/Http/Controllers/Admin/DashboardController';
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
    usersTrendText: string;
    recentServers: ChartPoint[];
    recentServersTotal: number;
    serversTrendText: string;
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
        <div className="relative flex h-full flex-col gap-1 rounded-md bg-sidebar p-1">
            <div className="relative flex aspect-video flex-col justify-between overflow-hidden rounded-md border border-sidebar-accent bg-background p-4">
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
                                content={<ChartTooltip label={tooltipUnit} />}
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
            <div className="flex items-center justify-between px-2">
                <span className="text-xs font-medium text-muted-foreground">
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
        <div className="flex h-full flex-col gap-1 rounded-md bg-sidebar p-1">
            <div className="rounded-md border border-sidebar-accent bg-background p-4">
                <span className="text-xs text-muted-foreground">{label}</span>
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
    usersTrendText,
    recentServers,
    recentServersTotal,
    serversTrendText,
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
                description="Monitor platform activity and resource usage."
            >
                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                    <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-2">
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
                                footerText={usersTrendText}
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
                                    recentServersTotal === 1
                                        ? 'server'
                                        : 'servers'
                                }
                                color="#a855f7"
                                gradientId="adminServerGradient"
                                footerText={serversTrendText}
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
                    </div>
                </div>
            </AdminLayout>
        </AppLayout>
    );
}
