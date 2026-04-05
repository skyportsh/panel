import { Head, Link, usePage } from '@inertiajs/react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { home } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const usageData = [
    { day: 'Mar 1', amount: 1.2 },
    { day: 'Mar 3', amount: 1.2 },
    { day: 'Mar 6', amount: 1.2 },
    { day: 'Mar 9', amount: 1.2 },
    { day: 'Mar 12', amount: 1.2 },
    { day: 'Mar 15', amount: 1.2 },
    { day: 'Mar 18', amount: 1.4 },
    { day: 'Mar 21', amount: 1.4 },
    { day: 'Mar 24', amount: 1.4 },
    { day: 'Mar 27', amount: 1.3 },
    { day: 'Mar 30', amount: 2.5 },
];

function UsageTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: { payload: { day: string; amount: number } }[];
}) {
    if (!active || !payload?.length) {
        return null;
    }

    const { day, amount } = payload[0].payload;

    return (
        <div className="rounded-md border border-sidebar-accent bg-background px-2.5 py-1.5 shadow-md">
            <p className="text-xs font-medium text-foreground">
                {amount.toFixed(1)} hrs
            </p>
            <p className="text-xs text-muted-foreground">{day}</p>
        </div>
    );
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: home(),
    },
];

export default function Home() {
    const { auth } = usePage().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Home" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                        <div className="relative flex h-full flex-col justify-between p-2">
                            <div className="space-y-1 pb-4">
                                <div className="space-y-2">
                                    <h2 className="mt-2 ml-2 text-xl font-semibold tracking-tight text-foreground">
                                        {auth.user.name}, welcome back!
                                    </h2>
                                </div>
                            </div>

                            <div className="grow space-y-3">
                                <div className="flex h-full flex-col gap-1 rounded-md bg-sidebar p-1">
                                    <div className="relative flex grow flex-col justify-between overflow-hidden rounded-md border border-sidebar-accent bg-background p-4">
                                        <div className="absolute inset-x-0 bottom-0 z-10 h-1/3 bg-gradient-to-t from-background to-transparent" />
                                        <div className="absolute inset-x-0 bottom-0 h-2/4">
                                            <ResponsiveContainer
                                                width="100%"
                                                height="100%"
                                            >
                                                <AreaChart
                                                    data={usageData}
                                                    margin={{
                                                        top: 0,
                                                        right: 0,
                                                        left: 0,
                                                        bottom: 0,
                                                    }}
                                                >
                                                    <defs>
                                                        <linearGradient
                                                            id="usageGradient"
                                                            x1="0"
                                                            y1="0"
                                                            x2="0"
                                                            y2="1"
                                                        >
                                                            <stop
                                                                offset="0%"
                                                                stopColor="#0ea5e9"
                                                                stopOpacity="0.3"
                                                            />
                                                            <stop
                                                                offset="100%"
                                                                stopColor="#0ea5e9"
                                                                stopOpacity="0"
                                                            />
                                                        </linearGradient>
                                                    </defs>
                                                    <Tooltip
                                                        content={
                                                            <UsageTooltip />
                                                        }
                                                        cursor={{
                                                            stroke: '#0ea5e9',
                                                            strokeWidth: 1,
                                                            strokeDasharray:
                                                                '4 4',
                                                        }}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="amount"
                                                        stroke="#0ea5e9"
                                                        strokeWidth={2}
                                                        fill="url(#usageGradient)"
                                                        dot={false}
                                                        activeDot={{
                                                            r: 4,
                                                            fill: '#0ea5e9',
                                                            stroke: '#0ea5e9',
                                                            strokeWidth: 0,
                                                        }}
                                                        isAnimationActive={true}
                                                        animationDuration={800}
                                                        animationEasing="ease-out"
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="relative">
                                            <h1 className="text-md font-semibold tracking-tight text-foreground">
                                                Your recent usage
                                            </h1>
                                            <span className="text-xs text-muted-foreground">
                                                Last 30 days of activity
                                            </span>
                                        </div>
                                        <span className="relative z-20 text-sm font-semibold text-foreground">
                                            4.0 hours
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="pl-2 text-xs font-medium text-muted-foreground">
                                            Resource usage is steady
                                        </span>
                                        <Link
                                            href={
                                                auth.user.is_admin
                                                    ? '/admin/users'
                                                    : '/settings/profile'
                                            }
                                            className="rounded-md border border-sidebar-accent bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-sidebar-accent"
                                        >
                                            {auth.user.is_admin
                                                ? 'Manage users'
                                                : 'Manage account'}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                </div>
                <div className="relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
            </div>
        </AppLayout>
    );
}
