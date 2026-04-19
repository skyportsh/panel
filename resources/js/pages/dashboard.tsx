import { Head, router } from "@inertiajs/react";
import { Cpu, MemoryStick } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Column, PaginatedData } from "@/components/admin/data-table";
import { DataTable } from "@/components/admin/data-table";
import ServerStatusIndicator from "@/components/server-status-indicator";
import { Switch } from "@/components/ui/switch";
import AppLayout from "@/layouts/app-layout";
import { formatServerAddress } from "@/lib/server-runtime";
import { home } from "@/routes";
import {
	console as serverConsole,
	websocket as websocketCredentials,
} from "@/routes/client/servers";
import type { Auth, BreadcrumbItem } from "@/types";

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
	} | null;
	user: {
		id: number;
		name: string;
	};
};

type Props = {
	auth: Auth;
	filters: {
		scope: "all" | "mine";
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
		title: "Home",
		href: home(),
	},
];

const defaultStats: ServerStats = {
	cpu: "—",
	memory: "—",
	running: false,
	state: "offline",
};

const homeServerScopeCookieName = "home_server_scope";

function persistHomeServerScope(scope: "all" | "mine"): void {
	if (typeof document === "undefined") {
		return;
	}

	document.cookie = `${homeServerScopeCookieName}=${scope};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}

function formatGiBLimit(memoryMib: number): string {
	const gibibytes = memoryMib / 1024;
	const formatted = Number.isInteger(gibibytes)
		? gibibytes.toLocaleString()
		: gibibytes.toFixed(1).replace(/\.0$/, "");

	return `${formatted} GiB`;
}

function formatMemoryUsage(memory: string, limitMib: number): string {
	const current =
		memory === "—" || memory === "Offline"
			? "0 MiB"
			: (memory.split("/")[0]?.trim() ?? "0 MiB");

	return `${current} / ${formatGiBLimit(limitMib)}`;
}

function formatCpuUsage(cpu: string, limit: number): string {
	const current = cpu === "—" || cpu === "Offline" ? "0%" : cpu.trim();

	return `${current} / ${limit === 0 ? "Unlimited" : `${limit}%`}`;
}

async function fetchWebsocketCredentials(
	serverId: number,
): Promise<WebsocketCredentials["data"]> {
	const response = await fetch(websocketCredentials.url(serverId), {
		headers: {
			Accept: "application/json",
			"X-Requested-With": "XMLHttpRequest",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Failed to fetch websocket credentials for server ${serverId}.`,
		);
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

	// Prefetch server console pages in the background so clicks feel instant
	useEffect(() => {
		const timer = setTimeout(() => {
			for (const server of servers.data.slice(0, 10)) {
				router.prefetch(`/server/${server.id}/console`, { method: 'get' }, { cacheFor: '1m' });
			}
		}, 500);
		return () => clearTimeout(timer);
	}, [servers.data]);

	useEffect(() => {
		if (!auth.user.is_admin) {
			return;
		}

		persistHomeServerScope(filters.scope);
	}, [auth.user.is_admin, filters.scope]);

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

				socket.addEventListener("open", () => {
					socket.send(
						JSON.stringify({
							event: "auth",
							args: [credentials.token],
						}),
					);
				});

				socket.addEventListener("message", (event) => {
					const payload = JSON.parse(event.data) as {
						event: string;
						args?: unknown[];
					};

					if (payload.event === "auth success") {
						socket.send(JSON.stringify({ event: "send stats", args: [] }));

						return;
					}

					if (payload.event === "status") {
						const nextStatus = String(payload.args?.[0] ?? "offline");

						setStats((current) => ({
							...current,
							[serverId]: {
								...(current[serverId] ?? defaultStats),
								running: nextStatus === "running",
								state: nextStatus,
							},
						}));

						return;
					}

					if (payload.event !== "stats") {
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
								? String(snapshot?.stats?.CPUPerc ?? "0%")
								: "Offline",
							memory: snapshot?.running
								? String(snapshot?.stats?.MemUsage ?? "—")
								: "Offline",
							running: Boolean(snapshot?.running),
							state: String(snapshot?.state ?? "offline"),
						},
					}));
				});

				socket.addEventListener("close", () => {
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
			label: "Name",
			width: "min-w-0 w-[52%] shrink-0",
			render: (server) => {
				const serverStats = stats[server.id] ?? defaultStats;

				return (
					<div className="min-w-0 pr-4">
						<div className="flex items-center gap-2">
							<p className="truncate text-sm font-medium text-foreground">
								{server.name}
							</p>
							<ServerStatusIndicator
								status={serverStats.state || server.status}
							/>
						</div>
						<p className="mt-1 truncate text-xs text-muted-foreground">
							{formatServerAddress(server)}
						</p>
					</div>
				);
			},
		},
		{
			label: "Memory",
			width: "w-64 shrink-0",
			render: (server) => {
				const serverStats = stats[server.id] ?? defaultStats;

				return (
					<div className="pr-4">
						<div className="flex items-center gap-2 text-sm font-medium text-foreground">
							<MemoryStick className="h-4 w-4 text-muted-foreground" />
							<span>
								{formatMemoryUsage(serverStats.memory, server.memory_mib)}
							</span>
						</div>
					</div>
				);
			},
		},
		{
			label: "CPU",
			width: "w-56 shrink-0",
			render: (server) => {
				const serverStats = stats[server.id] ?? defaultStats;

				return (
					<div>
						<div className="flex items-center gap-2 text-sm font-medium text-foreground">
							<Cpu className="h-4 w-4 text-muted-foreground" />
							<span>{formatCpuUsage(serverStats.cpu, server.cpu_limit)}</span>
						</div>
					</div>
				);
			},
		},
	];

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Home" />
			<div className="flex h-full flex-1 flex-col gap-6 px-4 py-6">
				<div className="flex items-start justify-between gap-4 py-0.5">
					<div className="space-y-0.5">
						<h2 className="text-xl font-semibold tracking-tight">Servers</h2>
						<p className="text-sm text-muted-foreground">
							A list of all servers that you own or have access to.
						</p>
					</div>

					{auth.user.is_admin ? (
						<div className="flex items-center gap-3">
							<span className="text-sm text-muted-foreground">
								{filters.scope === "all"
									? "Showing all servers"
									: "Showing your servers"}
							</span>
							<Switch
								checked={filters.scope === "all"}
								onCheckedChange={(checked) => {
									const nextScope = checked ? "all" : "mine";
									persistHomeServerScope(nextScope);
									navigate({
										scope: nextScope,
										search: search || undefined,
									});
								}}
							/>
						</div>
					) : null}
				</div>

				<DataTable
					data={servers}
					columns={columns}
					onRowClick={(server) => router.visit(serverConsole.url(server.id))}
					searchValue={search}
					onSearch={(value) => {
						setSearch(value);
						navigate({
							scope: filters.scope === "all" ? "all" : undefined,
							search: value || undefined,
						});
					}}
					emptyMessage="No servers found"
					emptySearchMessage="Try a different server name."
					entityName="server"
					selectable={false}
				/>
			</div>
		</AppLayout>
	);
}
