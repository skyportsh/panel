import { Head, Link } from "@inertiajs/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import Heading from "@/components/heading";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { PlaceholderPattern } from "@/components/ui/placeholder-pattern";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import { cn } from "@/lib/utils";
import { edit as editActivity } from "@/routes/activity";
import type { BreadcrumbItem } from "@/types";

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
    method: string;
    path: string;
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
        title: "Activity",
        href: editActivity(),
    },
];

function formatTimestamp(value: string | null): {
    absolute: string;
    relative: string;
} {
    if (!value) {
        return {
            absolute: "Unknown time",
            relative: "Unknown",
        };
    }

    const date = new Date(value);
    const absolute = new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
    const differenceInMinutes = Math.round(
        (date.getTime() - Date.now()) / 60000,
    );
    const relativeFormatter = new Intl.RelativeTimeFormat("en", {
        numeric: "auto",
    });

    if (Math.abs(differenceInMinutes) < 60) {
        return {
            absolute,
            relative: relativeFormatter.format(differenceInMinutes, "minute"),
        };
    }

    const differenceInHours = Math.round(differenceInMinutes / 60);

    if (Math.abs(differenceInHours) < 24) {
        return {
            absolute,
            relative: relativeFormatter.format(differenceInHours, "hour"),
        };
    }

    return {
        absolute,
        relative: relativeFormatter.format(
            Math.round(differenceInHours / 24),
            "day",
        ),
    };
}

function deviceLabel(userAgent: string | null): string {
    const agent = userAgent?.toLowerCase() ?? "";

    if (
        agent.includes("iphone") ||
        agent.includes("android") ||
        agent.includes("mobile")
    ) {
        return "Mobile device";
    }

    if (agent.includes("ipad") || agent.includes("tablet")) {
        return "Tablet";
    }

    return "Desktop browser";
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
    if (!value) {
        return null;
    }

    return (
        <div className="grid gap-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm wrap-reak-word text-foreground">{value}</p>
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

                    <div className="space-y-4">
                        <div className="overflow-hidden rounded-lg bg-muted/40">
                            <div className="relative flex items-center gap-3 px-4 py-2.5">
                                <span className="w-[42%] shrink-0 text-xs font-medium text-muted-foreground">
                                    Activity
                                </span>
                                <span className="w-[20%] shrink-0 text-xs font-medium text-muted-foreground">
                                    Device
                                </span>
                                <span className="flex-1 text-xs font-medium text-muted-foreground">
                                    Time
                                </span>
                            </div>

                            <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
                                <div className="flex flex-col gap-1 p-1">
                                    {activities.length > 0 ? (
                                        activities.map((activity) => {
                                            const timestamp = formatTimestamp(
                                                activity.createdAt,
                                            );

                                            return (
                                                <button
                                                    key={activity.id}
                                                    type="button"
                                                    className="group relative overflow-hidden rounded-md text-left transition-colors duration-150 ease-out hover:bg-muted/40"
                                                    onClick={() => {
                                                        setSelectedActivity(
                                                            activity,
                                                        );
                                                    }}
                                                >
                                                    <PlaceholderPattern
                                                        patternSize={6}
                                                        className="absolute inset-0 size-full stroke-neutral-900/10 opacity-0 transition-opacity group-hover:opacity-100 dark:stroke-neutral-100/10"
                                                    />
                                                    <div className="relative flex items-center gap-3 px-3 py-3 transition-transform duration-150 ease-out active:scale-[0.99] active:duration-0">
                                                        <div className="w-[42%] shrink-0 pr-4">
                                                            <p className="truncate text-sm font-medium text-foreground">
                                                                {
                                                                    activity.action
                                                                }
                                                            </p>
                                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                                {activity.path}
                                                            </p>
                                                        </div>
                                                        <div className="w-[20%] shrink-0 pr-4">
                                                            <p className="truncate text-xs text-muted-foreground">
                                                                {deviceLabel(
                                                                    activity.userAgent,
                                                                )}
                                                            </p>
                                                        </div>
                                                        <div className="min-w-0 flex-1 pr-2">
                                                            <p className="text-sm text-foreground">
                                                                {
                                                                    timestamp.relative
                                                                }
                                                            </p>
                                                            <p className="truncate text-xs text-muted-foreground">
                                                                {
                                                                    timestamp.absolute
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="px-4 py-12 text-center">
                                            <p className="text-sm font-medium text-foreground">
                                                No activity yet
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Sign-ins and important account
                                                updates will appear here.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {meta.lastPage > 1 ? (
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <p className="text-sm text-muted-foreground">
                                    Showing {meta.from ?? 0}-{meta.to ?? 0} of{" "}
                                    {meta.total.toLocaleString()}
                                </p>

                                <nav
                                    className="flex items-center justify-center gap-0.5"
                                    aria-label="Activity pagination"
                                >
                                    <Link
                                        href={links[0]?.url ?? "#"}
                                        preserveScroll
                                        className={cn(
                                            "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all duration-150 ease-out active:scale-95 active:duration-0",
                                            links[0]?.url
                                                ? "hover:bg-muted hover:text-foreground"
                                                : "pointer-events-none opacity-30",
                                        )}
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                    </Link>

                                    {links.slice(1, -1).map((link, index) => {
                                        const page = index + 1;
                                        const current = meta.currentPage;
                                        const last = meta.lastPage;
                                        const isVisible =
                                            page === 1 ||
                                            page === last ||
                                            Math.abs(page - current) <= 1;
                                        const isEllipsis =
                                            !isVisible &&
                                            (page === 2 || page === last - 1);

                                        if (!isVisible && !isEllipsis) {
                                            return null;
                                        }

                                        if (isEllipsis) {
                                            return (
                                                <span
                                                    key={`ellipsis-${index}`}
                                                    className="flex h-7 w-7 items-center justify-center text-[11px] text-muted-foreground"
                                                >
                                                    …
                                                </span>
                                            );
                                        }

                                        return (
                                            <Link
                                                key={`page-${page}`}
                                                href={link.url ?? "#"}
                                                preserveScroll
                                                className={cn(
                                                    "flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-medium transition-all duration-150 ease-out active:scale-95 active:duration-0",
                                                    link.active
                                                        ? "bg-muted text-foreground"
                                                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                                )}
                                            >
                                                {page}
                                            </Link>
                                        );
                                    })}

                                    <Link
                                        href={
                                            links[links.length - 1]?.url ?? "#"
                                        }
                                        preserveScroll
                                        className={cn(
                                            "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all duration-150 ease-out active:scale-95 active:duration-0",
                                            links[links.length - 1]?.url
                                                ? "hover:bg-muted hover:text-foreground"
                                                : "pointer-events-none opacity-30",
                                        )}
                                    >
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </Link>
                                </nav>
                            </div>
                        ) : null}
                    </div>
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
                                        label="Device"
                                        value={deviceLabel(
                                            selectedActivity.userAgent,
                                        )}
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
