import { Head, router } from "@inertiajs/react";
import { useState } from "react";
import { index as adminAuditLog } from "@/actions/App/Http/Controllers/Admin/AuditLogController";
import { index as adminDashboard } from "@/actions/App/Http/Controllers/Admin/DashboardController";
import { DataTable } from "@/components/admin/data-table";
import type { Column, PaginatedData } from "@/components/admin/data-table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import AdminLayout from "@/layouts/admin/layout";
import AppLayout from "@/layouts/app-layout";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/types";

type ActivityUser = {
    id: number;
    name: string;
    email: string;
};

type ActivityItem = {
    action: string;
    context: {
        full_url?: string;
        query?: Record<string, string>;
        referer?: string | null;
        route_parameters?: Record<string, string | number | boolean>;
    };
    createdAt: string | null;
    createdAtHuman: string | null;
    id: number;
    method: string;
    path: string;
    routeName: string | null;
    statusCode: number | null;
    user: ActivityUser | null;
    userAgent: string | null;
};

type Props = {
    activities: PaginatedData<ActivityItem>;
    filters: { search: string };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Admin",
        href: adminDashboard.url(),
    },
    {
        title: "Activity",
        href: adminAuditLog.url(),
    },
];

function methodColor(method: string): string {
    switch (method.toUpperCase()) {
        case "GET":
            return "text-emerald-500";
        case "POST":
            return "text-sky-500";
        case "PATCH":
        case "PUT":
            return "text-amber-500";
        case "DELETE":
            return "text-red-500";
        default:
            return "text-muted-foreground";
    }
}

function statusColor(code: number | null): string {
    if (!code) {
        return "text-muted-foreground";
    }

    if (code < 300) {
        return "text-emerald-500";
    }

    if (code < 400) {
        return "text-sky-500";
    }

    if (code < 500) {
        return "text-amber-500";
    }

    return "text-red-500";
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
            <p className="wrap-break-word text-sm text-foreground">{value}</p>
        </div>
    );
}

const columns: Column<ActivityItem>[] = [
    {
        label: "User",
        width: "w-[25%] shrink-0 pr-4",
        render: (item) => (
            <>
                <p className="truncate text-sm font-medium text-foreground">
                    {item.user?.name ?? "System"}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.user?.email ?? "—"}
                </p>
            </>
        ),
    },
    {
        label: "Activity",
        width: "w-[30%] shrink-0 pr-4",
        render: (item) => (
            <>
                <p className="truncate text-sm font-medium text-foreground">
                    {item.action}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.path}
                </p>
            </>
        ),
    },
    {
        label: "Method",
        width: "w-[10%] shrink-0",
        render: (item) => (
            <span
                className={cn(
                    "font-mono text-xs font-medium",
                    methodColor(item.method),
                )}
            >
                {item.method}
            </span>
        ),
    },
    {
        label: "Status",
        width: "w-[10%] shrink-0",
        render: (item) => (
            <span
                className={cn(
                    "font-mono text-xs font-medium",
                    statusColor(item.statusCode),
                )}
            >
                {item.statusCode ?? "—"}
            </span>
        ),
    },
    {
        label: "Time",
        width: "flex-1",
        render: (item) => (
            <p className="text-sm text-muted-foreground">
                {item.createdAtHuman ?? "Unknown"}
            </p>
        ),
    },
];

export default function AuditLog({ activities, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [selectedActivity, setSelectedActivity] =
        useState<ActivityItem | null>(null);

    const handleSearch = (value: string) => {
        setSearch(value);
        router.get(
            adminAuditLog.url(),
            { search: value || undefined },
            { preserveState: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin — Activity" />

            <AdminLayout
                title="Activity"
                description="Platform-wide activity across all users."
            >
                <DataTable
                    data={activities}
                    columns={columns}
                    searchValue={search}
                    onSearch={handleSearch}
                    onRowClick={setSelectedActivity}
                    selectable={false}
                    emptyMessage="No activity found"
                    emptySearchMessage="Try a different search term."
                    entityName="activity"
                />

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
                                        Activity details
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                    <DetailRow
                                        label="User"
                                        value={
                                            selectedActivity.user
                                                ? `${selectedActivity.user.name} (${selectedActivity.user.email})`
                                                : "System"
                                        }
                                    />
                                    <DetailRow
                                        label="When"
                                        value={
                                            selectedActivity.createdAt
                                                ? new Intl.DateTimeFormat(
                                                      "en-GB",
                                                      {
                                                          dateStyle: "medium",
                                                          timeStyle: "short",
                                                      },
                                                  ).format(
                                                      new Date(
                                                          selectedActivity.createdAt,
                                                      ),
                                                  )
                                                : null
                                        }
                                    />
                                    <DetailRow
                                        label="Method & Path"
                                        value={`${selectedActivity.method} ${selectedActivity.path}`}
                                    />
                                    <DetailRow
                                        label="Status Code"
                                        value={
                                            selectedActivity.statusCode?.toString() ??
                                            null
                                        }
                                    />
                                    <DetailRow
                                        label="Route"
                                        value={selectedActivity.routeName}
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
            </AdminLayout>
        </AppLayout>
    );
}
