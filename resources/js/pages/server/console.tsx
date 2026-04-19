import { Head } from "@inertiajs/react";
import { AlertCircle, Play, RotateCw, Square, X } from "lucide-react";
import {
	type ComponentType,
	type FormEvent,
	type SVGProps,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Area,
	AreaChart,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
} from "recharts";
import CargoIcon from "@/components/cargo-icon";
import NetworkingIcon from "@/components/networking-icon";
import ServerNodeIcon from "@/components/server-node-icon";
import ServerStatusIndicator from "@/components/server-status-indicator";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PlaceholderPattern } from "@/components/ui/placeholder-pattern";
import { toast } from "@/components/ui/sonner";
import { Spinner } from "@/components/ui/spinner";
import AppLayout from "@/layouts/app-layout";
import {
	formatServerAddress,
	powerActionsForState,
} from "@/lib/server-runtime";
import { cn } from "@/lib/utils";
import { home } from "@/routes";
import {
	power as powerServer,
	console as serverConsole,
	websocket as websocketCredentials,
} from "@/routes/client/servers";
import type { BreadcrumbItem } from "@/types";

type ServerPowerSignal = "kill" | "restart" | "start" | "stop";
type ConfirmedSignal = "kill";

type Props = {
	server: {
		cpu_limit: number;
		disk_mib: number;
		id: number;
		name: string;
		status: string;
		last_error: string | null;
		memory_mib: number;
		cargo: {
			id: number;
			name: string;
		};
		node: {
			id: number;
			name: string;
		};
		allocation: {
			bind_ip: string;
			ip_alias: string | null;
			port: number;
		} | null;
	};
};

type WebsocketCredentials = {
	data: {
		expires_at: string;
		socket: string;
		token: string;
	};
};

type ConsoleLineTone = "default" | "error" | "input" | "system";

type ConsoleLine = {
	id: number;
	text: string;
	tone: ConsoleLineTone;
};

type SocketPayload = {
	event: string;
	args?: unknown[];
};

type AnsiSegment = {
	className: string;
	text: string;
};

type ResourceUsage = {
	cpuPercent: number;
	diskMib: number;
	diskPercent: number;
	memoryMib: number;
	memoryPercent: number;
	running: boolean;
};

type ResourceHistoryPoint = {
	cpu: number;
	disk: number;
	memory: number;
	time: string;
};

const MAX_CONSOLE_LINES = 50;
const MAX_RESOURCE_HISTORY_POINTS = 20;
const PRIMARY_CHART_COLOR = "var(--brand)";
const ANSI_ESCAPE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;
const ANSI_SGR_SEGMENT_PATTERN = /(\u001B\[[0-9;]*m)/g;
const ANSI_SGR_PATTERN = /^\u001B\[([0-9;]*)m$/;

function csrfToken(): string {
	return (
		document
			.querySelector('meta[name="csrf-token"]')
			?.getAttribute("content") ?? ""
	);
}

async function fetchWebsocketToken(
	serverId: number,
): Promise<WebsocketCredentials["data"]> {
	const response = await fetch(websocketCredentials.url(serverId), {
		headers: {
			Accept: "application/json",
			"X-Requested-With": "XMLHttpRequest",
		},
	});

	if (!response.ok) {
		throw new Error("Failed to fetch websocket credentials.");
	}

	const payload = (await response.json()) as WebsocketCredentials;

	return payload.data;
}

function formatPercent(value: number): string {
	return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

function formatMib(value: number): string {
	if (value >= 1024) {
		return `${(value / 1024).toFixed(value >= 10240 ? 0 : 1).replace(/\.0$/, "")} GiB`;
	}

	if (value >= 10) {
		return `${Math.round(value)} MiB`;
	}

	return `${value.toFixed(1).replace(/\.0$/, "")} MiB`;
}

function parsePercent(value: string | undefined): number {
	const parsed = Number.parseFloat((value ?? "0").replace("%", ""));

	if (!Number.isFinite(parsed) || parsed < 0) {
		return 0;
	}

	return parsed;
}

function sizeUnitToMib(unit: string): number {
	switch (unit.toUpperCase()) {
		case "B":
			return 1 / (1024 * 1024);
		case "KIB":
		case "KB":
			return 1 / 1024;
		case "MIB":
		case "MB":
			return 1;
		case "GIB":
		case "GB":
			return 1024;
		case "TIB":
		case "TB":
			return 1024 * 1024;
		default:
			return 0;
	}
}

function parseSizeToMib(value: string | undefined): number {
	const match = value?.trim().match(/([\d.]+)\s*([KMGT]?i?B|B)/i);

	if (!match) {
		return 0;
	}

	const amount = Number.parseFloat(match[1] ?? "0");

	if (!Number.isFinite(amount) || amount < 0) {
		return 0;
	}

	return amount * sizeUnitToMib(match[2] ?? "MiB");
}

function parseMemoryUsageToMib(value: string | undefined): number {
	return parseSizeToMib(value?.split("/")[0]?.trim());
}

function bytesToMib(bytes: number | undefined): number {
	if (!bytes || bytes < 0) {
		return 0;
	}

	return bytes / (1024 * 1024);
}

function usagePercent(used: number, limit: number): number {
	if (limit <= 0) {
		return Math.min(100, Math.max(0, used));
	}

	return Math.min(100, Math.max(0, (used / limit) * 100));
}

function buildRuntimeUsage(
	snapshot:
		| {
				disk_bytes?: number;
				running?: boolean;
				stats?: {
					CPUPerc?: string;
					MemUsage?: string;
				};
		  }
		| undefined,
	server: Props["server"],
): ResourceUsage {
	const running = Boolean(snapshot?.running);
	const cpuPercent = running ? parsePercent(snapshot?.stats?.CPUPerc) : 0;
	const memoryMib = running
		? parseMemoryUsageToMib(snapshot?.stats?.MemUsage)
		: 0;
	const diskMib = bytesToMib(snapshot?.disk_bytes);

	return {
		cpuPercent,
		diskMib,
		diskPercent: usagePercent(diskMib, server.disk_mib),
		memoryMib,
		memoryPercent: usagePercent(memoryMib, server.memory_mib),
		running,
	};
}

function resourceHistoryTime(): string {
	return new Intl.DateTimeFormat(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(new Date());
}

function stripAnsi(text: string): string {
	return text.replaceAll(ANSI_ESCAPE_PATTERN, "");
}

function splitConsoleLines(text: string): string[] {
	const normalized = text.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
	const lines = normalized.split("\n");

	if (lines.at(-1) === "") {
		lines.pop();
	}

	return lines.length > 0 ? lines : [""];
}

const ANSI_FG_MAP: Record<number, string> = {
	30: "text-zinc-500",       // black (dark gray in terminals)
	31: "text-rose-400",       // red
	32: "text-emerald-400",    // green
	33: "text-amber-300",      // yellow
	34: "text-sky-400",        // blue
	35: "text-fuchsia-400",    // magenta
	36: "text-cyan-300",       // cyan
	37: "text-foreground",     // white
	39: "text-foreground",     // default
	90: "text-muted-foreground", // bright black (gray)
	91: "text-rose-400",       // bright red
	92: "text-emerald-400",    // bright green
	93: "text-amber-300",      // bright yellow
	94: "text-sky-400",        // bright blue
	95: "text-fuchsia-400",    // bright magenta
	96: "text-cyan-300",       // bright cyan
	97: "text-foreground",     // bright white
};

function ansiClassName(codes: number[]): string {
	const classNames: string[] = [];

	// Check for bold/dim
	if (codes.includes(1)) {
		classNames.push("font-semibold");
	}
	if (codes.includes(3)) {
		classNames.push("italic");
	}
	if (codes.includes(4)) {
		classNames.push("underline");
	}
	if (codes.includes(9)) {
		classNames.push("line-through");
	}

	// Find the last foreground color code
	let fgClass = "";
	for (let i = codes.length - 1; i >= 0; i--) {
		const mapped = ANSI_FG_MAP[codes[i]];
		if (mapped) {
			fgClass = mapped;
			break;
		}
	}

	classNames.push(fgClass || "text-foreground");

	return classNames.join(" ");
}

function ansiSegments(text: string): AnsiSegment[] {
	const parts = text.split(ANSI_SGR_SEGMENT_PATTERN);
	let activeCodes: number[] = [];
	const segments: AnsiSegment[] = [];

	for (const part of parts) {
		if (part.length === 0) {
			continue;
		}

		const match = part.match(ANSI_SGR_PATTERN);

		if (match) {
			const codes = (match[1] || "0")
				.split(";")
				.filter((value) => value.length > 0)
				.map((value) => Number.parseInt(value, 10))
				.filter((value) => !Number.isNaN(value));

			// Reset clears all codes; otherwise merge new codes in.
			// Code 0 = reset, 22 = normal intensity, 23 = not italic, etc.
			if (codes.length === 0 || codes.includes(0)) {
				// Reset, then apply any non-zero codes in the same sequence
				activeCodes = codes.filter((c) => c !== 0);
			} else {
				// Merge: replace color codes, add style codes
				const newFg = codes.find((c) => (c >= 30 && c <= 39) || (c >= 90 && c <= 97));
				if (newFg !== undefined) {
					// Remove old fg codes
					activeCodes = activeCodes.filter((c) => !((c >= 30 && c <= 39) || (c >= 90 && c <= 97)));
				}
				// Remove codes that are being turned off (22=unbold, 23=unitalic, etc)
				if (codes.includes(22)) activeCodes = activeCodes.filter((c) => c !== 1);
				if (codes.includes(23)) activeCodes = activeCodes.filter((c) => c !== 3);
				if (codes.includes(24)) activeCodes = activeCodes.filter((c) => c !== 4);

				activeCodes = [...activeCodes, ...codes.filter((c) => c !== 22 && c !== 23 && c !== 24)];
			}
			continue;
		}

		segments.push({
			className: ansiClassName(activeCodes),
			text: part,
		});
	}

	return segments.length > 0
		? segments
		: [
				{
					className: "text-foreground",
					text: stripAnsi(text),
				},
			];
}

function ConsoleLineText({ text }: { text: string }) {
	const segments = ansiSegments(text);
	const plainText = stripAnsi(text);
	let segmentOffset = 0;

	if (plainText.length === 0) {
		return <span> </span>;
	}

	return (
		<>
			{segments.map((segment) => {
				const key = `${segmentOffset}-${segment.className}-${segment.text}`;
				segmentOffset += segment.text.length;

				return (
					<span key={key} className={segment.className}>
						{segment.text}
					</span>
				);
			})}
		</>
	);
}

function consoleLineClasses(tone: ConsoleLineTone): string {
	switch (tone) {
		case "error":
			return "text-rose-600 dark:text-rose-400";
		case "system":
			return "text-muted-foreground";
		case "input":
			return "text-foreground";
		default:
			return "text-foreground";
	}
}

function ConsoleRenderedLine({ line }: { line: ConsoleLine }) {
	return (
		<div
			className={cn(
				"wrap-break-word whitespace-pre-wrap",
				consoleLineClasses(line.tone),
			)}
		>
			{line.tone === "system" ? "[Skyport Daemon]: " : null}
			{line.tone === "input" ? "> " : null}
			<ConsoleLineText text={line.text} />
		</div>
	);
}

function ServerMetaItem({
	icon: Icon,
	label,
	value,
}: {
	icon: ComponentType<SVGProps<SVGSVGElement>>;
	label: string;
	value: string;
}) {
	return (
		<div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-1 py-1">
			<div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background text-muted-foreground shadow-xs ring-1 ring-border/60">
				<PlaceholderPattern
					patternSize={4}
					className="pointer-events-none absolute inset-0 size-full stroke-current opacity-[0.12]"
				/>
				<Icon className="relative h-4 w-4" />
			</div>
			<div className="min-w-0 space-y-0.5 pl-2">
				<p className="text-xs font-medium text-muted-foreground">{label}</p>
				<p className="truncate text-sm font-medium text-foreground">{value}</p>
			</div>
		</div>
	);
}

function ResourceChartTooltip({
	active,
	label,
	payload,
}: {
	active?: boolean;
	label?: string;
	payload?: Array<{ value?: number }>;
}) {
	if (!active || !payload?.length) {
		return null;
	}

	return (
		<div className="rounded-md border border-sidebar-accent bg-background px-2.5 py-1.5 shadow-md">
			<p className="text-xs font-medium text-foreground">
				{formatPercent(Number(payload[0]?.value ?? 0))} used
			</p>
			<p className="text-xs text-muted-foreground">{label}</p>
		</div>
	);
}

function ResourceUsageCard({
	data,
	dataKey,
	title,
	usage,
	usageLabel,
}: {
	data: ResourceHistoryPoint[];
	dataKey: "cpu" | "disk" | "memory";
	title: string;
	usage: string;
	usageLabel: string;
}) {
	return (
		<div className="relative flex h-full flex-col gap-1 rounded-md bg-sidebar p-1">
			<div className="relative flex aspect-16/7 flex-col justify-between overflow-hidden rounded-md border border-sidebar-accent bg-background p-4">
				<div className="absolute inset-x-0 bottom-0 z-10 h-1/3 bg-linear-to-t from-background to-transparent" />
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
									id={`server-console-${dataKey}-gradient`}
									x1="0"
									y1="0"
									x2="0"
									y2="1"
								>
									<stop
										offset="0%"
										stopColor={PRIMARY_CHART_COLOR}
										stopOpacity="0.3"
									/>
									<stop
										offset="100%"
										stopColor={PRIMARY_CHART_COLOR}
										stopOpacity="0"
									/>
								</linearGradient>
							</defs>
							<RechartsTooltip
								content={<ResourceChartTooltip />}
								cursor={{
									stroke: PRIMARY_CHART_COLOR,
									strokeDasharray: "4 4",
									strokeWidth: 1,
								}}
							/>
							<Area
								type="monotone"
								dataKey={dataKey}
								stroke={PRIMARY_CHART_COLOR}
								strokeWidth={2}
								fill={`url(#server-console-${dataKey}-gradient)`}
								dot={false}
								activeDot={{
									r: 4,
									fill: PRIMARY_CHART_COLOR,
									stroke: PRIMARY_CHART_COLOR,
									strokeWidth: 0,
								}}
								isAnimationActive
								animationDuration={500}
								animationEasing="ease-out"
							/>
						</AreaChart>
					</ResponsiveContainer>
				</div>
				<div className="relative">
					<h2 className="text-md font-semibold tracking-tight text-foreground">
						{title}
					</h2>
					<span className="text-xs text-muted-foreground">{usageLabel}</span>
				</div>
				<span className="relative z-20 text-sm font-semibold text-foreground">
					{usage}
				</span>
			</div>
		</div>
	);
}

export default function ServerConsole({ server }: Props) {
	const [runtimeState, setRuntimeState] = useState(server.status);
	const [submittingAction, setSubmittingAction] =
		useState<ServerPowerSignal | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);
	const [confirmingSignal, setConfirmingSignal] =
		useState<ConfirmedSignal | null>(null);
	const [socketConnected, setSocketConnected] = useState(false);
	const [consolePhase, setConsolePhase] = useState<
		"connecting" | "requesting-logs" | "ready"
	>("connecting");
	const [socketError, setSocketError] = useState<string | null>(null);
	const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
	const [runtimeUsage, setRuntimeUsage] = useState<ResourceUsage>({
		cpuPercent: 0,
		diskMib: 0,
		diskPercent: 0,
		memoryMib: 0,
		memoryPercent: 0,
		running: server.status === "running",
	});
	const [resourceHistory, setResourceHistory] = useState<
		ResourceHistoryPoint[]
	>([]);
	const [command, setCommand] = useState("");
	const [commandHistory, setCommandHistory] = useState<string[]>(() => {
		if (typeof window === "undefined") {
			return [];
		}

		try {
			const stored = window.localStorage.getItem(
				`server-console-history:${server.id}`,
			);

			return stored ? (JSON.parse(stored) as string[]) : [];
		} catch {
			return [];
		}
	});
	const [historyIndex, setHistoryIndex] = useState(-1);
	const submittingActionRef = useRef<ServerPowerSignal | null>(null);
	const socketRef = useRef<WebSocket | null>(null);
	const reconnectTimeout = useRef<number | null>(null);
	const consoleViewportRef = useRef<HTMLDivElement | null>(null);
	const nextConsoleLineIdRef = useRef(0);
	const skipNextCloseRef = useRef(false);
	const consolePhaseTimeoutRef = useRef<number | null>(null);
	const lastMessageAtRef = useRef<number>(Date.now());
	const heartbeatIntervalRef = useRef<number | null>(null);

	const effectiveState = useMemo(() => {
		if (
			submittingAction === "start" &&
			(runtimeState === "offline" || runtimeState === "install_failed")
		) {
			return "starting";
		}

		if (submittingAction === "stop") {
			return "stopping";
		}

		if (submittingAction === "restart") {
			return "restarting";
		}

		return runtimeState;
	}, [runtimeState, submittingAction]);

	const availability = powerActionsForState(effectiveState);
	const showKillInStopSlot =
		(effectiveState === "starting" || effectiveState === "stopping") &&
		availability.kill;
	const breadcrumbs: BreadcrumbItem[] = [
		{
			title: "Home",
			href: home(),
		},
		{
			title: server.name,
			href: serverConsole(server.id),
		},
		{
			title: "Console",
			href: serverConsole(server.id),
		},
	];
	const resourceChartData =
		resourceHistory.length > 0
			? resourceHistory
			: [
					{
						cpu: runtimeUsage.cpuPercent,
						disk: runtimeUsage.diskPercent,
						memory: runtimeUsage.memoryPercent,
						time: "Now",
					},
				];
	const cpuUsageLabel =
		server.cpu_limit === 0
			? `${formatPercent(runtimeUsage.cpuPercent)} / Unlimited`
			: `${formatPercent(runtimeUsage.cpuPercent)} / ${server.cpu_limit}%`;
	const memoryUsageLabel = `${formatMib(runtimeUsage.memoryMib)} / ${formatMib(server.memory_mib)}`;
	const diskUsageLabel = `${formatMib(runtimeUsage.diskMib)} / ${formatMib(server.disk_mib)}`;
	const consoleOverlayTitle = socketError
		? "Cannot reach the daemon"
		: consolePhase === "connecting"
			? "Connecting..."
			: "Requesting console logs...";
	const consoleOverlayDescription = socketError
		? "Waiting for connectivity..."
		: consolePhase === "connecting"
			? "Opening the websocket connection."
			: "Loading recent console output.";
	const consoleInputPlaceholder =
		socketConnected && consolePhase === "ready"
			? "Type a command and press enter…"
			: socketError
				? "Cannot reach the daemon…"
				: "Console is reconnecting…";

	const appendConsoleLine = useCallback(
		(text: string, tone: ConsoleLineTone = "default") => {
			const nextLines = splitConsoleLines(text);

			setConsoleLines((currentLines) => {
				const appendedLines = nextLines.map((line) => ({
					id: ++nextConsoleLineIdRef.current,
					text: line,
					tone,
				}));

				return [...currentLines, ...appendedLines].slice(-MAX_CONSOLE_LINES);
			});

		},
		[],
	);

	const finishConsoleLoading = useCallback(() => {
		if (consolePhaseTimeoutRef.current) {
			window.clearTimeout(consolePhaseTimeoutRef.current);
			consolePhaseTimeoutRef.current = null;
		}

		setConsolePhase("ready");
	}, []);

	const requestSocketSync = useCallback(() => {
		if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
			return;
		}

		socketRef.current.send(JSON.stringify({ event: "send stats", args: [] }));
		socketRef.current.send(JSON.stringify({ event: "send logs", args: [] }));
	}, []);

	const updateRuntimeState = useCallback((nextState: string) => {
		if (
			(submittingActionRef.current === "stop" ||
				submittingActionRef.current === "restart") &&
			nextState === "running"
		) {
			return;
		}

		setRuntimeState(nextState);
		setSubmittingAction(null);
		setActionError(null);
	}, []);

	const handleSocketPayload = useCallback(
		(payload: SocketPayload) => {
			lastMessageAtRef.current = Date.now();

			switch (payload.event) {
				case "auth success": {
					setSocketConnected(true);
					setSocketError(null);
					nextConsoleLineIdRef.current = 0;
					setConsoleLines([]);
					setResourceHistory([]);
					setRuntimeUsage({
						cpuPercent: 0,
						diskMib: 0,
						diskPercent: 0,
						memoryMib: 0,
						memoryPercent: 0,
						running: false,
					});
					setConsolePhase("requesting-logs");
					requestSocketSync();

					if (consolePhaseTimeoutRef.current) {
						window.clearTimeout(consolePhaseTimeoutRef.current);
					}

					consolePhaseTimeoutRef.current = window.setTimeout(() => {
						setConsolePhase("ready");
						consolePhaseTimeoutRef.current = null;
					}, 1200);

					return;
				}
				case "auth error":
				case "jwt error": {
					setSocketConnected(false);
					setConsolePhase("connecting");
					setSocketError("Console authentication failed.");
					appendConsoleLine("Console authentication failed.", "error");
					return;
				}
				case "status": {
					const nextState = String(payload.args?.[0] ?? "offline");
					updateRuntimeState(nextState);
					return;
				}
				case "stats": {
					const snapshot = payload.args?.[0] as
						| {
								disk_bytes?: number;
								running?: boolean;
								state?: string;
								stats?: {
									CPUPerc?: string;
									MemUsage?: string;
								};
						  }
						| undefined;

					const nextUsage = buildRuntimeUsage(snapshot, server);

					setRuntimeUsage(nextUsage);
					setResourceHistory((currentHistory) =>
						[
							...currentHistory,
							{
								cpu: nextUsage.cpuPercent,
								disk: nextUsage.diskPercent,
								memory: nextUsage.memoryPercent,
								time: resourceHistoryTime(),
							},
						].slice(-MAX_RESOURCE_HISTORY_POINTS),
					);
					updateRuntimeState(String(snapshot?.state ?? "offline"));
					return;
				}
				case "console output":
				case "install output":
				case "transfer logs": {
					finishConsoleLoading();
					appendConsoleLine(String(payload.args?.[0] ?? ""));
					return;
				}
				case "daemon message": {
					finishConsoleLoading();
					appendConsoleLine(String(payload.args?.[0] ?? ""), "system");
					return;
				}
				case "daemon error": {
					finishConsoleLoading();
					appendConsoleLine(String(payload.args?.[0] ?? ""), "error");
					return;
				}
				case "transfer status": {
					if (String(payload.args?.[0] ?? "") === "failure") {
						appendConsoleLine("Transfer has failed.", "error");
					}

					return;
				}
				default: {
					return;
				}
			}
		},
		[
			appendConsoleLine,
			finishConsoleLoading,
			requestSocketSync,
			server,
			updateRuntimeState,
		],
	);

	const connect = useCallback(async () => {
		if (reconnectTimeout.current) {
			window.clearTimeout(reconnectTimeout.current);
			reconnectTimeout.current = null;
		}

		if (socketRef.current) {
			skipNextCloseRef.current = true;
			socketRef.current.close();
			socketRef.current = null;
		}

		setSocketConnected(false);
		setConsolePhase("connecting");

		try {
			const credentials = await fetchWebsocketToken(server.id);
			const socket = new WebSocket(credentials.socket);

			socketRef.current = socket;

			socket.addEventListener("open", () => {
				setSocketError(null);
				lastMessageAtRef.current = Date.now();
				socket.send(
					JSON.stringify({
						event: "auth",
						args: [credentials.token],
					}),
				);

				// Start a heartbeat that checks for stale connections.
				if (heartbeatIntervalRef.current) {
					window.clearInterval(heartbeatIntervalRef.current);
				}

				heartbeatIntervalRef.current = window.setInterval(() => {
					const elapsed = Date.now() - lastMessageAtRef.current;

					// If we haven't received anything in 15 seconds, the
					// connection is likely dead. Force a reconnect.
					if (elapsed > 15_000) {
						socket.close();
						return;
					}

					// Periodically request stats to keep the connection alive
					// and verify it's still responsive.
					if (socket.readyState === WebSocket.OPEN && elapsed > 5_000) {
						socket.send(
							JSON.stringify({
								event: "send stats",
								args: [],
							}),
						);
					}
				}, 5_000);
			});

			socket.addEventListener("message", (event) => {
				try {
					const payload = JSON.parse(event.data) as SocketPayload;
					handleSocketPayload(payload);
				} catch {
					appendConsoleLine("Received an unreadable console payload.", "error");
				}
			});

			socket.addEventListener("close", () => {
				setSocketConnected(false);
				setConsolePhase("connecting");
				socketRef.current = null;

				if (heartbeatIntervalRef.current) {
					window.clearInterval(heartbeatIntervalRef.current);
					heartbeatIntervalRef.current = null;
				}

				if (skipNextCloseRef.current) {
					skipNextCloseRef.current = false;
					return;
				}

				if (!reconnectTimeout.current) {
					reconnectTimeout.current = window.setTimeout(() => {
						reconnectTimeout.current = null;
						void connect();
					}, 3000);
				}
			});

			socket.addEventListener("error", () => {
				setSocketConnected(false);
				setConsolePhase("connecting");
				setSocketError("Console connection lost. Reconnecting…");
			});
		} catch {
			setSocketConnected(false);
			setConsolePhase("connecting");
			setSocketError("Console connection failed. Reconnecting…");

			if (!reconnectTimeout.current) {
				reconnectTimeout.current = window.setTimeout(() => {
					reconnectTimeout.current = null;
					void connect();
				}, 3000);
			}
		}
	}, [appendConsoleLine, handleSocketPayload, server.id]);

	useEffect(() => {
		submittingActionRef.current = submittingAction;
	}, [submittingAction]);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		window.localStorage.setItem(
			`server-console-history:${server.id}`,
			JSON.stringify(commandHistory.slice(0, 32)),
		);
	}, [commandHistory, server.id]);

	useEffect(() => {
		void connect();

		return () => {
			if (socketRef.current) {
				skipNextCloseRef.current = true;
				socketRef.current.close();
				socketRef.current = null;
			}

			if (reconnectTimeout.current) {
				window.clearTimeout(reconnectTimeout.current);
				reconnectTimeout.current = null;
			}

			if (consolePhaseTimeoutRef.current) {
				window.clearTimeout(consolePhaseTimeoutRef.current);
				consolePhaseTimeoutRef.current = null;
			}

			if (heartbeatIntervalRef.current) {
				window.clearInterval(heartbeatIntervalRef.current);
				heartbeatIntervalRef.current = null;
			}
		};
	}, [connect]);

	const lastConsoleLineId = consoleLines.at(-1)?.id ?? 0;

	useEffect(() => {
		const viewport = consoleViewportRef.current;

		if (!viewport) {
			return;
		}

		// Force scroll to bottom on every new console line.
		viewport.scrollTop = viewport.scrollHeight;
		requestAnimationFrame(() => {
			viewport.scrollTop = viewport.scrollHeight;
		});
	}, [lastConsoleLineId]);

	const sendPowerSignal = async (signal: ServerPowerSignal) => {
		setSubmittingAction(signal);
		setActionError(null);

		try {
			const response = await fetch(powerServer.url(server.id), {
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					"X-CSRF-TOKEN": csrfToken(),
					"X-Requested-With": "XMLHttpRequest",
				},
				body: JSON.stringify({ signal }),
			});

			const payload = (await response.json().catch(() => null)) as {
				message?: string;
			} | null;

			if (!response.ok) {
				throw new Error(
					payload?.message || "The power action could not be sent.",
				);
			}

			if (signal === "start") {
				setRuntimeState("starting");
			} else if (signal === "stop") {
				setRuntimeState("offline");
			} else if (signal === "restart") {
				setRuntimeState("starting");
			}

			toast.success(`${statusActionLabel(signal)} signal sent.`);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "The power action could not be sent.";

			setActionError(message);
			setSubmittingAction(null);
			toast.error(message);
		}
	};

	const sendConsoleCommand = (nextCommand: string) => {
		const trimmedCommand = nextCommand.trim();

		if (
			trimmedCommand.length === 0 ||
			!socketRef.current ||
			socketRef.current.readyState !== WebSocket.OPEN
		) {
			return;
		}

		socketRef.current.send(
			JSON.stringify({
				event: "send command",
				args: [trimmedCommand],
			}),
		);

		appendConsoleLine(trimmedCommand, "input");
		setCommandHistory((currentHistory) =>
			[
				trimmedCommand,
				...currentHistory.filter((entry) => entry !== trimmedCommand),
			].slice(0, 32),
		);
		setHistoryIndex(-1);
		setCommand("");
	};

	const handleCommandSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		sendConsoleCommand(command);
	};

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title={`${server.name} — Console`} />
			<div className="flex h-full flex-1 flex-col gap-6 px-4 py-6">
				<section className="space-y-5">
					<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
						<div className="min-w-0">
							<div className="flex items-center gap-3">
								<h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-xl">
									{server.name}
								</h1>
								<ServerStatusIndicator status={effectiveState} />
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-2 xl:max-w-104 xl:justify-end">
							<Button
								disabled={!availability.start || submittingAction !== null}
								onClick={() => void sendPowerSignal("start")}
							>
								<Play />
								Start
							</Button>
							<Button
								variant="secondary"
								disabled={!availability.restart || submittingAction !== null}
								onClick={() => void sendPowerSignal("restart")}
							>
								<RotateCw />
								Restart
							</Button>
							{showKillInStopSlot ? (
								<Button
									variant="secondary"
									disabled={submittingAction !== null}
									onClick={() => setConfirmingSignal("kill")}
								>
									<X />
									Kill
								</Button>
							) : (
								<Button
									variant="secondary"
									disabled={!availability.stop || submittingAction !== null}
									onClick={() => void sendPowerSignal("stop")}
								>
									<Square />
									Stop
								</Button>
							)}
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
						<ServerMetaItem
							icon={NetworkingIcon}
							label="IP address"
							value={formatServerAddress(server)}
						/>
						<ServerMetaItem
							icon={ServerNodeIcon}
							label="Node"
							value={server.node.name}
						/>
						<ServerMetaItem
							icon={CargoIcon}
							label="Cargo"
							value={server.cargo.name}
						/>
					</div>
				</section>

				{actionError ? (
					<div className="rounded-xl border border-brand/20 bg-brand/6 p-4 text-sm">
						<div className="flex items-start gap-3">
							<AlertCircle className="mt-0.5 h-4 w-4 text-brand" />
							<div className="space-y-1">
								<p className="font-medium text-foreground">
									Power action failed
								</p>
								<p className="text-muted-foreground">{actionError}</p>
							</div>
						</div>
					</div>
				) : null}

				<section className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
					<div
						ref={consoleViewportRef}
						className="relative h-104 overflow-y-auto bg-muted/25 px-4 py-4 font-mono text-[13px] leading-6"
					>
						<div
							className={cn(
								"transition-[filter,opacity] duration-200",
								consolePhase !== "ready" &&
									"pointer-events-none blur-[2px] opacity-60",
							)}
						>
							{consoleLines.length === 0 ? (
								<div className="flex h-full min-h-56 items-center justify-center rounded-lg border border-dashed border-border/70 bg-background/70 px-6 text-center text-sm text-muted-foreground">
									Waiting for console output…
								</div>
							) : (
								<div className="space-y-1">
									{consoleLines.map((line) => (
										<ConsoleRenderedLine key={line.id} line={line} />
									))}
								</div>
							)}
						</div>

						{consolePhase !== "ready" ? (
							<div className="absolute inset-0 flex items-center justify-center bg-background/35 px-6">
								<div className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/95 px-4 py-3 shadow-sm backdrop-blur-sm">
									<Spinner className="size-4 text-muted-foreground" />
									<div className="space-y-0.5 text-sm">
										<p className="font-medium text-foreground">
											{consoleOverlayTitle}
										</p>
										<p className="text-muted-foreground">
											{consoleOverlayDescription}
										</p>
									</div>
								</div>
							</div>
						) : null}
					</div>

					<div className="relative overflow-hidden border-t border-border/70 bg-muted/15 p-2">
						<PlaceholderPattern
							patternSize={6}
							className="pointer-events-none absolute inset-0 size-full stroke-current opacity-[0.08] text-muted-foreground"
						/>
						<form onSubmit={handleCommandSubmit}>
							<div className="flex items-center gap-3 rounded-lg bg-transparent px-3">
								<input
									value={command}
									onChange={(event) => setCommand(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "ArrowUp") {
											const nextIndex = Math.min(
												historyIndex + 1,
												commandHistory.length - 1,
											);

											if (nextIndex >= 0) {
												setHistoryIndex(nextIndex);
												setCommand(commandHistory[nextIndex] ?? "");
											}

											event.preventDefault();
										}

										if (event.key === "ArrowDown") {
											const nextIndex = Math.max(historyIndex - 1, -1);

											setHistoryIndex(nextIndex);
											setCommand(
												nextIndex >= 0 ? (commandHistory[nextIndex] ?? "") : "",
											);
											event.preventDefault();
										}
									}}
									disabled={!socketConnected || consolePhase !== "ready"}
									placeholder={consoleInputPlaceholder}
									autoCapitalize="none"
									autoCorrect="off"
									spellCheck={false}
									className="h-11 w-full bg-transparent text-sm text-foreground outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
								/>
							</div>
						</form>
					</div>
				</section>

				<section className="grid auto-rows-min gap-4 lg:grid-cols-3">
					<ResourceUsageCard
						title="Memory"
						usage={memoryUsageLabel}
						usageLabel={`${formatPercent(runtimeUsage.memoryPercent)} used`}
						data={resourceChartData}
						dataKey="memory"
					/>
					<ResourceUsageCard
						title="CPU"
						usage={cpuUsageLabel}
						usageLabel={`${formatPercent(runtimeUsage.cpuPercent)} used`}
						data={resourceChartData}
						dataKey="cpu"
					/>
					<ResourceUsageCard
						title="Disk"
						usage={diskUsageLabel}
						usageLabel={`${formatPercent(runtimeUsage.diskPercent)} used`}
						data={resourceChartData}
						dataKey="disk"
					/>
				</section>
			</div>

			<AlertDialog
				open={confirmingSignal !== null}
				onOpenChange={(open) => {
					if (!open) {
						setConfirmingSignal(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{`Kill ${server.name}?`}</AlertDialogTitle>
						<AlertDialogDescription>
							This will forcibly terminate the server process immediately.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={submittingAction !== null}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={confirmingSignal === null || submittingAction !== null}
							onClick={(event) => {
								event.preventDefault();
								if (!confirmingSignal) {
									return;
								}

								const signal = confirmingSignal;
								setConfirmingSignal(null);
								void sendPowerSignal(signal);
							}}
						>
							{submittingAction !== null && <Spinner />}
							Kill server
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</AppLayout>
	);
}

function statusActionLabel(signal: ServerPowerSignal): string {
	switch (signal) {
		case "kill":
			return "Kill";
		case "restart":
			return "Restart";
		case "start":
			return "Start";
		default:
			return "Stop";
	}
}
