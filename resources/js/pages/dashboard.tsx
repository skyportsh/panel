import { Head, router } from '@inertiajs/react';
import { Activity, Cpu, MemoryStick } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DataTable } from '@/components/admin/data-table';
import type { Column, PaginatedData } from '@/components/admin/data-table';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { home } from '@/routes';
import { show as websocketCredentials } from '@/actions/App/Http/Controllers/Client/ServerWebsocketController';
import type { Auth, BreadcrumbItem } from '@/types';

type DashboardServer = {
    id: number;
    name: string;
    status: string;
    memory_mib: number;
    cpu_limit: number;
    allocation: {
        bind_ip: string;
        ip_alias: string | null;
        port: number;
    };
    user: {
        id: number;
        name: string;
    };
};

type Props = {
    auth: Auth;
    filters: {
        scope: 'all' | 'mine';
        search: string;
    };
    servers: PaginatedData<DashboardServer>;
};

type WebsocketCredentials = {
    data: {
        expires_at: string;
        socket: string;
        token: string;
    };
};

type ServerStats = {
    cpu: string;
    memory: string;
    running: boolean;
    state: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Home',
        href: home(),
    },
];

const defaultStats: ServerStats = {
    cpu: '—',
    memory: '—',
    running: false,
    state: 'offline',
};

function formatServerAddress(server: DashboardServer): string {
    return `${server.allocation.ip_alias ?? server.allocation.bind_ip}:${server.allocation.port}`;
}

function statusTone(status: string): string {
    switch (status) {
        case 'running':
            return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
        case 'starting':
        case 'installing':
            return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
        case 'install_failed':
            return 'bg-[#d92400]/12 text-[#d92400] dark:text-[#ff8a6b]';
        default:
            return 'bg-muted text-muted-foreground';
    }
}

function statusLabel(status: string): string {
    switch (status) {
        case 'running':
            return 'Running';
        case 'starting':
            return 'Starting';
        case 'installing':
            return 'Installing';
        case 'install_failed':
            return 'Install failed';
        default:
            return 'Offline';
    }
}

async function fetchWebsocketCredentials(serverId: number): Promise<WebsocketCredentials['data']> {
    const response = await fetch(websocketCredentials.url(serverId), {
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch websocket credentials for server ${serverId}.`);
    }

    const payload = (await response.json()) as WebsocketCredentials;

    return payload.data;
}

export default function Home({ auth, filters, servers }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [stats, setStats] = useState<Record<number, ServerStats>>({});
    const sockets = useRef<Map<number, WebSocket>>(new Map());
    const reconnectTimeouts = useRef<Map<number, number>>(new Map());

    const visibleServerIds = useMemo(
        () => servers.data.map((server) => server.id),
        [servers.data],
    );

    useEffect(() => {
        setSearch(filters.search);
    }, [filters.search]);

    useEffect(() => {
        let active = true;

        const cleanupSocket = (serverId: number) => {
            const socket = sockets.current.get(serverId);
            if (socket) {
                socket.close();
                sockets.current.delete(serverId);
            }

            const timeout = reconnectTimeouts.current.get(serverId);
            if (timeout) {
                window.clearTimeout(timeout);
                reconnectTimeouts.current.delete(serverId);
            }
        };

        const connect = async (serverId: number) => {
            cleanupSocket(serverId);

            try {
                const credentials = await fetchWebsocketCredentials(serverId);

                if (!active) {
                    return;
                }

                const socket = new WebSocket(credentials.socket);
                sockets.current.set(serverId, socket);

                socket.addEventListener('open', () => {
                    socket.send(
                        JSON.stringify({
                            event: 'auth',
                            args: [credentials.token],
                        }),
                    );
                });

                socket.addEventListener('message', (event) => {
                    const payload = JSON.parse(event.data) as {
                        event: string;
                        args?: unknown[];
                    };

                    if (payload.event === 'auth success') {
                        socket.send(JSON.stringify({ event: 'send stats', args: [] }));

                        return;
                    }

                    if (payload.event === 'status') {
                        const nextStatus = String(payload.args?.[0] ?? 'offline');

                        setStats((current) => ({
                            ...current,
                            [serverId]: {
                                ...(current[serverId] ?? defaultStats),
                                running: nextStatus === 'running',
                                state: nextStatus,
                            },
                        }));

                        return;
                    }

                    if (payload.event !== 'stats') {
                        return;
                    }

                    const snapshot = payload.args?.[0] as
                        | {
                              running?: boolean;
                              state?: string;
                              stats?: {
                                  CPUPerc?: string;
                                  MemUsage?: string;
                              };
                          }
                        | undefined;

                    setStats((current) => ({
                        ...current,
                        [serverId]: {
                            cpu: snapshot?.running
                                ? String(snapshot?.stats?.CPUPerc ?? '0%')
                                : 'Offline',
                            memory: snapshot?.running
                                ? String(snapshot?.stats?.MemUsage ?? '—')
                                : 'Offline',
                            running: Boolean(snapshot?.running),
                            state: String(snapshot?.state ?? 'offline'),
                        },
                    }));
                });

                socket.addEventListener('close', () => {
                    sockets.current.delete(serverId);

                    if (!active || !visibleServerIds.includes(serverId)) {
                        return;
                    }

                    const timeout = window.setTimeout(() => {
                        void connect(serverId);
                    }, 3000);

                    reconnectTimeouts.current.set(serverId, timeout);
                });
            } catch {
                if (!active) {
                    return;
                }

                const timeout = window.setTimeout(() => {
                    void connect(serverId);
                }, 3000);

                reconnectTimeouts.current.set(serverId, timeout);
            }
        };

        visibleServerIds.forEach((serverId) => {
            void connect(serverId);
        });

        Array.from(sockets.current.keys())
            .filter((serverId) => !visibleServerIds.includes(serverId))
            .forEach(cleanupSocket);

        return () => {
            active = false;
            visibleServerIds.forEach(cleanupSocket);
        };
    }, [visibleServerIds]);

    const navigate = (params: Record<string, string | undefined>) => {
        router.get(home(), params as Record<string, string>, {
            preserveState: true,
            replace: true,
        });
    };

    const columns: Column<DashboardServer>[] = [
        {
            label: 'Name',
            width: 'min-w-0 flex-[1.7]',
            render: (server) => {
                const serverStats = stats[server.id] ?? defaultStats;

                return (
                    <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-foreground">
                                {server.name}
                            </p>
                            <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${statusTone(serverStats.state || server.status)}`}
                            >
                                {statusLabel(serverStats.state || server.status)}
                            </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                            {formatServerAddress(server)}
                            {auth.user.is_admin && filters.scope === 'all'
                                ? ` · ${server.user.name}`
                                : ''}
                        </p>
                    </div>
                );
            },
        },
        {
            label: 'Memory',
            width: 'w-56 shrink-0',
            render: (server) => {
                const serverStats = stats[server.id] ?? defaultStats;

                return (
                    <div className="pr-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <MemoryStick className="h-4 w-4 text-muted-foreground" />
                            <span>{serverStats.memory}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Limit {server.memory_mib.toLocaleString()} MiB
                        </p>
                    </div>
                );
            },
        },
        {
            label: 'CPU',
            width: 'w-44 shrink-0',
            render: (server) => {
                const serverStats = stats[server.id] ?? defaultStats;

                return (
                    <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Cpu className="h-4 w-4 text-muted-foreground" />
                            <span>{serverStats.cpu}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Limit {server.cpu_limit === 0 ? 'Unlimited' : `${server.cpu_limit}%`}
                        </p>
                    </div>
                );
            },
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Home" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="overflow-hidden rounded-lg bg-muted/40">
                    <div className="relative rounded-lg border border-border/70 bg-background p-4">
                        <PlaceholderPattern
                            patternSize={8}
                            className="pointer-events-none absolute inset-0 size-full stroke-current opacity-[0.05]"
                        />
                        <div className="relative flex items-center justify-between gap-4">
                            <div>
                                <h1 className="text-lg font-semibold text-foreground">
                                    Servers
                                </h1>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    View live resource usage from your servers.
                                </p>
                            </div>

                            {auth.user.is_admin ? (
                                <label className="flex items-center gap-3 rounded-md border border-border/70 bg-muted/30 px-3 py-2">
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-foreground">
                                            {filters.scope === 'all'
                                                ? 'Showing all servers'
                                                : 'Showing your servers'}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Toggle admin scope
                                        </p>
                                    </div>
                                    <Switch
                                        checked={filters.scope === 'all'}
                                        onCheckedChange={(checked) =>
                                            navigate({
                                                scope: checked ? 'all' : 'mine',
                                                search: search || undefined,
                                            })
                                        }
                                    />
                                </label>
                            ) : null}
                        </div>
                    </div>
                </div>

                <DataTable
                    data={servers}
                    columns={columns}
                    searchValue={search}
                    onSearch={(value) => {
                        setSearch(value);
                        navigate({
                            scope: filters.scope === 'all' ? 'all' : undefined,
                            search: value || undefined,
                        });
                    }}
                    emptyMessage="No servers found"
                    emptySearchMessage="Try a different server name."
                    entityName="server"
                    selectable={false}
                    actions={
                        <div className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">
                            <Activity className="h-3.5 w-3.5" />
                            Live stats via skyportd
                        </div>
                    }
                />
            </div>
        </AppLayout>
    );
}
