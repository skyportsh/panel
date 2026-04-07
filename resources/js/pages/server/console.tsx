import { Head } from "@inertiajs/react";
import { AlertCircle, ChevronRight, Play, RotateCw, Square, X } from "lucide-react";
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
import { show as serverConsole } from "@/actions/App/Http/Controllers/Client/ServerConsoleController";
import { store as powerServer } from "@/actions/App/Http/Controllers/Client/ServerPowerController";
import { show as websocketCredentials } from "@/actions/App/Http/Controllers/Client/ServerWebsocketController";
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
import CargoIcon from "@/components/cargo-icon";
import NetworkingIcon from "@/components/networking-icon";
import ServerNodeIcon from "@/components/server-node-icon";
import { Button } from "@/components/ui/button";
import { PlaceholderPattern } from "@/components/ui/placeholder-pattern";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/sonner";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import AppLayout from "@/layouts/app-layout";
import {
    formatServerAddress,
    powerActionsForState,
    statusLabel,
} from "@/lib/server-runtime";
import { cn } from "@/lib/utils";
import { home } from "@/routes";
import type { BreadcrumbItem } from "@/types";

type ServerPowerSignal = "kill" | "restart" | "start" | "stop";
type ConfirmedSignal = "restart" | "stop";

type Props = {
    server: {
        id: number;
        name: string;
        status: string;
        last_error: string | null;
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
        };
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

const MAX_CONSOLE_LINES = 50;
const ANSI_ESCAPE_PATTERN =
    // eslint-disable-next-line no-control-regex
    /\u001B\[[0-?]*[ -/]*[@-~]/g;

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

function statusDotTone(status: string): string {
    switch (status) {
        case "running":
            return "bg-emerald-500 ring-emerald-500/25";
        case "starting":
        case "installing":
        case "stopping":
        case "restarting":
            return "bg-amber-500 ring-amber-500/25";
        case "install_failed":
            return "bg-[#d92400] ring-[#d92400]/20";
        case "pending":
            return "bg-sky-500 ring-sky-500/25";
        default:
            return "bg-muted-foreground/55 ring-muted-foreground/15";
    }
}

function consoleConnectionTone(isConnected: boolean): string {
    return isConnected ? "bg-emerald-400" : "bg-amber-400";
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

function ansiClassName(codes: number[]): string {
    const classNames = new Set<string>();

    if (codes.includes(1)) {
        classNames.add("font-semibold");
    }

    if (codes.includes(31) || codes.includes(91)) {
        classNames.add("text-rose-400");
    } else if (codes.includes(32) || codes.includes(92)) {
        classNames.add("text-emerald-400");
    } else if (codes.includes(33) || codes.includes(93)) {
        classNames.add("text-amber-300");
    } else if (codes.includes(34) || codes.includes(94)) {
        classNames.add("text-sky-400");
    } else if (codes.includes(35) || codes.includes(95)) {
        classNames.add("text-fuchsia-400");
    } else if (codes.includes(36) || codes.includes(96)) {
        classNames.add("text-cyan-300");
    } else if (codes.includes(37) || codes.includes(97)) {
        classNames.add("text-slate-100");
    } else if (codes.includes(90)) {
        classNames.add("text-slate-400");
    } else {
        classNames.add("text-foreground dark:text-slate-200");
    }

    return [...classNames].join(" ");
}

function ansiSegments(text: string): AnsiSegment[] {
    const parts = text.split(/(\u001b\[[0-9;]*m)/g);
    let activeCodes: number[] = [];
    const segments: AnsiSegment[] = [];

    for (const part of parts) {
        if (part.length === 0) {
            continue;
        }

        const match = part.match(/^\u001b\[([0-9;]*)m$/);

        if (match) {
            const codes = (match[1] || "0")
                .split(";")
                .filter((value) => value.length > 0)
                .map((value) => Number.parseInt(value, 10))
                .filter((value) => !Number.isNaN(value));

            activeCodes = codes.length === 0 || codes.includes(0) ? [] : codes;
            continue;
        }

        segments.push({
            className: ansiClassName(activeCodes),
            text: part,
        });
    }

    return segments.length > 0
        ? segments
        : [{ className: "text-foreground dark:text-slate-200", text: stripAnsi(text) }];
}

function ConsoleLineText({ text }: { text: string }) {
    const segments = ansiSegments(text);
    const plainText = stripAnsi(text);

    if (plainText.length === 0) {
        return <span> </span>;
    }

    return (
        <>
            {segments.map((segment, index) => (
                <span key={`${segment.text}-${index}`} className={segment.className}>
                    {segment.text}
                </span>
            ))}
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
            return "text-foreground dark:text-slate-200";
        default:
            return "text-foreground dark:text-slate-200";
    }
}

function ConsoleRenderedLine({ line }: { line: ConsoleLine }) {
    return (
        <div
            className={cn(
                "break-words whitespace-pre-wrap",
                consoleLineClasses(line.tone),
            )}
        >
            {line.tone === "system" ? "[Skyport Daemon]: " : null}
            {line.tone === "input" ? "> " : null}
            <ConsoleLineText text={line.text} />
        </div>
    );
}

function ServerStatusDot({ status }: { status: string }) {
    const label = statusLabel(status);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full outline-hidden"
                    aria-label={`Server status: ${label}`}
                >
                    <span
                        className={`relative flex h-2 w-2 items-center justify-center rounded-full ring-4 ${statusDotTone(status)}`}
                    >
                    </span>
                </button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{label}</p>
            </TooltipContent>
        </Tooltip>
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
                <p className="text-xs font-medium text-muted-foreground">
                    {label}
                </p>
                <p className="truncate text-sm font-medium text-foreground">
                    {value}
                </p>
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
    const [, setSocketError] = useState<string | null>(null);
    const [consoleLines, setConsoleLines] = useState<ConsoleLine[]>([]);
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

    const appendConsoleLine = useCallback(
        (text: string, tone: ConsoleLineTone = "default") => {
            const nextLines = splitConsoleLines(text);

            setConsoleLines((currentLines) => {
                const appendedLines = nextLines.map((line) => ({
                    id: ++nextConsoleLineIdRef.current,
                    text: line,
                    tone,
                }));

                return [...currentLines, ...appendedLines].slice(
                    -MAX_CONSOLE_LINES,
                );
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
            switch (payload.event) {
                case "auth success": {
                    setSocketConnected(true);
                    setSocketError(null);
                    nextConsoleLineIdRef.current = 0;
                    setConsoleLines([]);
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
                              state?: string;
                          }
                        | undefined;

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
        [appendConsoleLine, finishConsoleLoading, requestSocketSync, updateRuntimeState],
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
        setSocketError(null);

        try {
            const credentials = await fetchWebsocketToken(server.id);
            const socket = new WebSocket(credentials.socket);

            socketRef.current = socket;

            socket.addEventListener("open", () => {
                socket.send(
                    JSON.stringify({
                        event: "auth",
                        args: [credentials.token],
                    }),
                );
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
        };
    }, [connect]);

    useEffect(() => {
        const viewport = consoleViewportRef.current;

        if (!viewport) {
            return;
        }

        viewport.scrollTop = viewport.scrollHeight;
    }, [consoleLines]);

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
        setCommandHistory((currentHistory) => [
            trimmedCommand,
            ...currentHistory.filter((entry) => entry !== trimmedCommand),
        ].slice(0, 32));
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
                                <ServerStatusDot status={effectiveState} />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 xl:max-w-104 xl:justify-end">
                            <Button
                                disabled={
                                    !availability.start ||
                                    submittingAction !== null
                                }
                                onClick={() => void sendPowerSignal("start")}
                            >
                                <Play />
                                Start
                            </Button>
                            <Button
                                variant="secondary"
                                disabled={
                                    !availability.restart ||
                                    submittingAction !== null
                                }
                                onClick={() => setConfirmingSignal("restart")}
                            >
                                <RotateCw />
                                Restart
                            </Button>
                            {showKillInStopSlot ? (
                                <Button
                                    variant="secondary"
                                    disabled={submittingAction !== null}
                                    onClick={() => void sendPowerSignal("kill")}
                                >
                                    <X />
                                    Kill
                                </Button>
                            ) : (
                                <Button
                                    variant="secondary"
                                    disabled={
                                        !availability.stop ||
                                        submittingAction !== null
                                    }
                                    onClick={() => setConfirmingSignal("stop")}
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
                    <div className="rounded-xl border border-[#d92400]/20 bg-[#d92400]/6 p-4 text-sm">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-4 w-4 text-[#d92400]" />
                            <div className="space-y-1">
                                <p className="font-medium text-foreground">
                                    Power action failed
                                </p>
                                <p className="text-muted-foreground">
                                    {actionError}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}

                <section className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
                    <div
                        ref={consoleViewportRef}
                        className="relative h-[26rem] overflow-y-auto bg-muted/25 px-4 py-4 font-mono text-[13px] leading-6"
                    >
                        <div
                            className={cn(
                                "transition-[filter,opacity] duration-200",
                                consolePhase !== "ready" && "pointer-events-none blur-[2px] opacity-60",
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
                                            {consolePhase === "connecting"
                                                ? "Connecting..."
                                                : "Requesting console logs..."}
                                        </p>
                                        <p className="text-muted-foreground">
                                            {consolePhase === "connecting"
                                                ? "Opening the websocket connection."
                                                : "Loading recent console output."}
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
                                            const nextIndex = Math.max(
                                                historyIndex - 1,
                                                -1,
                                            );

                                            setHistoryIndex(nextIndex);
                                            setCommand(
                                                nextIndex >= 0
                                                    ? (commandHistory[nextIndex] ?? "")
                                                    : "",
                                            );
                                            event.preventDefault();
                                        }
                                    }}
                                    disabled={!socketConnected || consolePhase !== "ready"}
                                    placeholder={
                                        socketConnected && consolePhase === "ready"
                                            ? "Type a command and press enter…"
                                            : "Console is reconnecting…"
                                    }
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    className="h-11 w-full bg-transparent text-sm text-foreground outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
                                />
                            </div>
                        </form>
                    </div>
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
                        <AlertDialogTitle>
                            {confirmingSignal === "restart"
                                ? `Restart ${server.name}?`
                                : `Stop ${server.name}?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmingSignal === "restart"
                                ? "This will send the configured stop command, wait for the server to shut down, and then start it again."
                                : "This will send the configured stop command and shut the server down."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submittingAction !== null}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={
                                confirmingSignal === null ||
                                submittingAction !== null
                            }
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
                            {confirmingSignal === "restart"
                                ? "Restart server"
                                : "Stop server"}
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
