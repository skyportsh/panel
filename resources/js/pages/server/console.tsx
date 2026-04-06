import { Head } from '@inertiajs/react';
import { AlertCircle, Play, RotateCw, Square, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { show as serverConsole } from '@/actions/App/Http/Controllers/Client/ServerConsoleController';
import { store as powerServer } from '@/actions/App/Http/Controllers/Client/ServerPowerController';
import { show as websocketCredentials } from '@/actions/App/Http/Controllers/Client/ServerWebsocketController';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/sonner';
import AppLayout from '@/layouts/app-layout';
import {
    formatServerAddress,
    powerActionsForState,
    statusLabel,
    statusTone,
} from '@/lib/server-runtime';
import { home } from '@/routes';
import type { BreadcrumbItem } from '@/types';

type ServerPowerSignal = 'kill' | 'restart' | 'start' | 'stop';
type ConfirmedSignal = 'restart' | 'stop';

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

function csrfToken(): string {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? ''
    );
}

async function fetchWebsocketToken(
    serverId: number,
): Promise<WebsocketCredentials['data']> {
    const response = await fetch(websocketCredentials.url(serverId), {
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch websocket credentials.');
    }

    const payload = (await response.json()) as WebsocketCredentials;

    return payload.data;
}

export default function ServerConsole({ server }: Props) {
    const [runtimeState, setRuntimeState] = useState(server.status);
    const [submittingAction, setSubmittingAction] =
        useState<ServerPowerSignal | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [confirmingSignal, setConfirmingSignal] =
        useState<ConfirmedSignal | null>(null);
    const submittingActionRef = useRef<ServerPowerSignal | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<number | null>(null);

    const effectiveState = useMemo(() => {
        if (
            submittingAction === 'start' &&
            (runtimeState === 'offline' || runtimeState === 'install_failed')
        ) {
            return 'starting';
        }

        if (submittingAction === 'stop') {
            return 'stopping';
        }

        if (submittingAction === 'restart') {
            return 'restarting';
        }

        return runtimeState;
    }, [runtimeState, submittingAction]);

    useEffect(() => {
        submittingActionRef.current = submittingAction;
    }, [submittingAction]);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: home(),
        },
        {
            title: server.name,
            href: serverConsole(server.id),
        },
        {
            title: 'Console',
            href: serverConsole(server.id),
        },
    ];

    useEffect(() => {
        let active = true;

        const cleanup = () => {
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }

            if (reconnectTimeout.current) {
                window.clearTimeout(reconnectTimeout.current);
                reconnectTimeout.current = null;
            }
        };

        const scheduleReconnect = () => {
            if (!active || reconnectTimeout.current) {
                return;
            }

            reconnectTimeout.current = window.setTimeout(() => {
                reconnectTimeout.current = null;
                void connect();
            }, 3000);
        };

        const connect = async () => {
            cleanup();

            try {
                const credentials = await fetchWebsocketToken(server.id);

                if (!active) {
                    return;
                }

                const socket = new WebSocket(credentials.socket);
                socketRef.current = socket;

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
                        socket.send(
                            JSON.stringify({ event: 'send stats', args: [] }),
                        );

                        return;
                    }

                    if (payload.event === 'status') {
                        const nextState = String(
                            payload.args?.[0] ?? 'offline',
                        );

                        if (
                            (submittingActionRef.current === 'stop' ||
                                submittingActionRef.current === 'restart') &&
                            nextState === 'running'
                        ) {
                            return;
                        }

                        setRuntimeState(nextState);
                        setSubmittingAction(null);
                        setActionError(null);

                        return;
                    }

                    if (payload.event !== 'stats') {
                        return;
                    }

                    const snapshot = payload.args?.[0] as
                        | {
                              state?: string;
                          }
                        | undefined;

                    const nextState = String(snapshot?.state ?? 'offline');

                    if (
                        (submittingActionRef.current === 'stop' ||
                            submittingActionRef.current === 'restart') &&
                        nextState === 'running'
                    ) {
                        return;
                    }

                    setRuntimeState(nextState);
                    setSubmittingAction(null);
                    setActionError(null);
                });

                socket.addEventListener('close', () => {
                    socketRef.current = null;
                    scheduleReconnect();
                });
            } catch {
                scheduleReconnect();
            }
        };

        void connect();

        return () => {
            active = false;
            cleanup();
        };
    }, [server.id]);

    const availability = powerActionsForState(effectiveState);
    const showKillButton = availability.kill;

    const sendPowerSignal = async (signal: ServerPowerSignal) => {
        setSubmittingAction(signal);
        setActionError(null);

        try {
            const response = await fetch(powerServer.url(server.id), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ signal }),
            });

            const payload = (await response.json().catch(() => null)) as
                | { message?: string }
                | null;

            if (!response.ok) {
                throw new Error(
                    payload?.message || 'The power action could not be sent.',
                );
            }

            if (signal === 'start') {
                setRuntimeState('starting');
            } else if (signal === 'stop') {
                setRuntimeState('offline');
            } else if (signal === 'restart') {
                setRuntimeState('starting');
            }

            toast.success(`${statusActionLabel(signal)} signal sent.`);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'The power action could not be sent.';

            setActionError(message);
            setSubmittingAction(null);
            toast.error(message);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${server.name} Console`} />
            <div className="flex h-full flex-1 flex-col gap-6 px-4 py-6">
                <section className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
                    <div className="border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-6">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-xl font-semibold tracking-tight">
                                        {server.name}
                                    </h1>
                                    <span
                                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${statusTone(effectiveState)}`}
                                    >
                                        {statusLabel(effectiveState)}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Control the server lifecycle and review its
                                    assigned network details.
                                </p>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground">
                                    <span>{server.name}</span>
                                    <span className="text-muted-foreground">
                                        /
                                    </span>
                                    <span>{server.cargo.name}</span>
                                    <span className="text-muted-foreground">
                                        /
                                    </span>
                                    <span>{formatServerAddress(server)}</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 xl:max-w-[26rem] xl:justify-end">
                                <Button
                                    variant="outline"
                                    disabled={
                                        !availability.stop ||
                                        submittingAction !== null
                                    }
                                    onClick={() => setConfirmingSignal('stop')}
                                >
                                    <Square />
                                    Stop
                                </Button>
                                <Button
                                    disabled={
                                        !availability.start ||
                                        submittingAction !== null
                                    }
                                    onClick={() =>
                                        void sendPowerSignal('start')
                                    }
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
                                    onClick={() =>
                                        setConfirmingSignal('restart')
                                    }
                                >
                                    <RotateCw />
                                    Restart
                                </Button>
                                {showKillButton ? (
                                    <Button
                                        variant="destructive"
                                        disabled={submittingAction !== null}
                                        onClick={() =>
                                            void sendPowerSignal('kill')
                                        }
                                    >
                                        <X />
                                        Kill
                                    </Button>
                                ) : null}
                            </div>
                        </div>
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
                            {confirmingSignal === 'restart'
                                ? `Restart ${server.name}?`
                                : `Stop ${server.name}?`}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmingSignal === 'restart'
                                ? 'This will send the configured stop command, wait for the server to shut down, and then start it again.'
                                : 'This will send the configured stop command and shut the server down.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={submittingAction !== null}
                        >
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
                            {confirmingSignal === 'restart'
                                ? 'Restart server'
                                : 'Stop server'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}

function statusActionLabel(signal: ServerPowerSignal): string {
    switch (signal) {
        case 'kill':
            return 'Kill';
        case 'restart':
            return 'Restart';
        case 'start':
            return 'Start';
        default:
            return 'Stop';
    }
}
