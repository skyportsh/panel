import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { cn } from '@/lib/utils';
import { edit as editActivity } from '@/routes/activity';
import type { BreadcrumbItem } from '@/types';

type ActivityItem = {
    action: string;
    context: {
        full_url?: string;
        query?: Record<string, string>;
        referer?: string | null;
        route_parameters?: Record<string, string | number | boolean>;
    };
    createdAt: string | null;
    id: number;
    ipAddress: string | null;
    method: string;
    path: string;
    region: {
        code: string | null;
        iconSvg: string | null;
        name: string;
    } | null;
    routeName: string | null;
    statusCode: number | null;
    userAgent: string | null;
};

type PaginationLink = {
    active: boolean;
    label: string;
    url: string | null;
};

type Props = {
    activities: ActivityItem[];
    links: PaginationLink[];
    meta: {
        currentPage: number;
        from: number | null;
        lastPage: number;
        perPage: number;
        to: number | null;
        total: number;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Activity',
        href: editActivity(),
    },
];

function formatTimestamp(value: string | null): {
    absolute: string;
    relative: string;
} {
    if (!value) {
        return {
            absolute: 'Unknown time',
            relative: 'Unknown',
        };
    }

    const date = new Date(value);
    const absolute = new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
    const differenceInMinutes = Math.round(
        (date.getTime() - Date.now()) / 60000,
    );
    const relativeFormatter = new Intl.RelativeTimeFormat('en', {
        numeric: 'auto',
    });

    if (Math.abs(differenceInMinutes) < 60) {
        return {
            absolute,
            relative: relativeFormatter.format(differenceInMinutes, 'minute'),
        };
    }

    const differenceInHours = Math.round(differenceInMinutes / 60);

    if (Math.abs(differenceInHours) < 24) {
        return {
            absolute,
            relative: relativeFormatter.format(differenceInHours, 'hour'),
        };
    }

    return {
        absolute,
        relative: relativeFormatter.format(
            Math.round(differenceInHours / 24),
            'day',
        ),
    };
}

function deviceLabel(userAgent: string | null): string {
    const agent = userAgent?.toLowerCase() ?? '';

    if (
        agent.includes('iphone') ||
        agent.includes('android') ||
        agent.includes('mobile')
    ) {
        return 'Mobile device';
    }

    if (agent.includes('ipad') || agent.includes('tablet')) {
        return 'Tablet';
    }

    return 'Desktop browser';
}

function friendlyStatus(statusCode: number | null): string {
    if (statusCode !== null && statusCode >= 400) {
        return 'Needs attention';
    }

    if (statusCode !== null && statusCode >= 300) {
        return 'Completed';
    }

    return 'Successful';
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
    if (!value) {
        return null;
    }

    return (
        <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm break-words text-foreground">{value}</p>
        </div>
    );
}

export default function Activity({ activities, links, meta }: Props) {
    const [selectedActivity, setSelectedActivity] =
        useState<ActivityItem | null>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity" />

            <h1 className="sr-only">Activity</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Account activity"
                        description="A simple history of sign-ins and important account changes"
                    />

                    <div className="overflow-hidden rounded-xl border border-border/70 bg-background">
                        {activities.length > 0 ? (
                            <div className="divide-y divide-border/70">
                                {activities.map((activity) => {
                                    const timestamp = formatTimestamp(
                                        activity.createdAt,
                                    );

                                    return (
                                        <div
                                            key={activity.id}
                                            className="flex items-start justify-between gap-4 px-4 py-4"
                                        >
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <p className="truncate text-sm font-medium text-foreground">
                                                    {activity.action}
                                                </p>

                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                                    <span>
                                                        {activity.region
                                                            ?.name ??
                                                            'Unknown location'}
                                                    </span>
                                                    <span>
                                                        {deviceLabel(
                                                            activity.userAgent,
                                                        )}
                                                    </span>
                                                    <span>
                                                        {friendlyStatus(
                                                            activity.statusCode,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                                                <div>
                                                    <p className="text-sm text-foreground">
                                                        {timestamp.relative}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {timestamp.absolute}
                                                    </p>
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-auto px-2 py-1 text-xs"
                                                    onClick={() => {
                                                        setSelectedActivity(
                                                            activity,
                                                        );
                                                    }}
                                                >
                                                    Details
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="px-4 py-12 text-center">
                                <p className="text-sm font-medium text-foreground">
                                    No activity yet
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Sign-ins and important account updates will
                                    appear here.
                                </p>
                            </div>
                        )}
                    </div>

                    {meta.lastPage > 1 ? (
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {meta.from ?? 0}-{meta.to ?? 0} of{' '}
                                {meta.total.toLocaleString()}
                            </p>

                            <nav
                                className="flex flex-wrap items-center gap-2"
                                aria-label="Activity pagination"
                            >
                                {links.map((link, index) => (
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
                    ) : null}
                </div>

                <Dialog
                    open={selectedActivity !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setSelectedActivity(null);
                        }
                    }}
                >
                    <DialogContent className="max-w-lg rounded-xl border-border/80">
                        {selectedActivity ? (
                            <>
                                <DialogHeader className="text-left">
                                    <DialogTitle>
                                        {selectedActivity.action}
                                    </DialogTitle>
                                    <DialogDescription>
                                        More information about this activity
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <DetailRow
                                        label="When"
                                        value={
                                            formatTimestamp(
                                                selectedActivity.createdAt,
                                            ).absolute
                                        }
                                    />
                                    <DetailRow
                                        label="Location"
                                        value={
                                            selectedActivity.region?.name ??
                                            'Unknown location'
                                        }
                                    />
                                    <DetailRow
                                        label="Device"
                                        value={deviceLabel(
                                            selectedActivity.userAgent,
                                        )}
                                    />
                                    <DetailRow
                                        label="Status"
                                        value={friendlyStatus(
                                            selectedActivity.statusCode,
                                        )}
                                    />
                                    <DetailRow
                                        label="IP address"
                                        value={
                                            selectedActivity.ipAddress ??
                                            'Unknown IP'
                                        }
                                    />
                                    <DetailRow
                                        label="Browser details"
                                        value={selectedActivity.userAgent}
                                    />
                                </div>
                            </>
                        ) : null}
                    </DialogContent>
                </Dialog>
            </SettingsLayout>
        </AppLayout>
    );
}
