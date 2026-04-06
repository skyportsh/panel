import { Head } from "@inertiajs/react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { show as serverConsole } from "@/actions/App/Http/Controllers/Client/ServerConsoleController";
import { store as powerServer } from "@/actions/App/Http/Controllers/Client/ServerPowerController";
import { show as serverSettings } from "@/actions/App/Http/Controllers/Client/ServerSettingsController";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/sonner";
import AppLayout from "@/layouts/app-layout";
import {
    formatServerAddress,
    statusLabel,
    statusTone,
} from "@/lib/server-runtime";
import { home } from "@/routes";
import type { BreadcrumbItem } from "@/types";

type Props = {
    server: {
        id: number;
        name: string;
        status: string;
        last_error: string | null;
        allowed_actions: {
            reinstall: boolean;
        };
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

function csrfToken(): string {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") ?? ""
    );
}

export default function ServerSettings({ server }: Props) {
    const [runtimeState, setRuntimeState] = useState(server.status);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

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
            title: "Settings",
            href: serverSettings(server.id),
        },
    ];

    const requestReinstall = async () => {
        setSubmitting(true);

        try {
            const response = await fetch(powerServer.url(server.id), {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": csrfToken(),
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify({ signal: "reinstall" }),
            });

            const payload = (await response.json().catch(() => null)) as {
                message?: string;
            } | null;

            if (!response.ok) {
                throw new Error(
                    payload?.message ||
                        "The reinstall request could not be sent.",
                );
            }

            setRuntimeState("installing");
            setConfirmOpen(false);
            toast.success("Server reinstall requested");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "The reinstall request could not be sent.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${server.name} Settings`} />
            <div className="flex h-full flex-1 flex-col gap-6 px-4 py-6">
                <section className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
                    <div className="border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">
                                {server.name}
                            </h1>
                            <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${statusTone(runtimeState)}`}
                            >
                                {statusLabel(runtimeState)}
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Manage destructive server operations that require
                            explicit confirmation.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
                            <span>{server.name}</span>
                            <span>{server.cargo.name}</span>
                            <span>{formatServerAddress(server)}</span>
                        </div>
                    </div>

                    <div className="px-5 py-10 sm:px-6">
                        <div className="rounded-2xl border border-[#d92400]/20 bg-[#d92400]/4 p-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-[#d92400] dark:text-[#ff8a6b]">
                                        <AlertTriangle className="h-4 w-4" />
                                        <h2 className="text-sm font-semibold">
                                            Reinstall server
                                        </h2>
                                    </div>
                                    <p className="max-w-2xl text-sm text-muted-foreground">
                                        This permanently deletes the current
                                        server files, reruns the cargo install
                                        script, and starts the server again
                                        automatically when installation
                                        succeeds.
                                    </p>
                                    {server.last_error ? (
                                        <p className="rounded-md bg-background/80 px-3 py-2 font-mono text-xs text-foreground">
                                            Last error: {server.last_error}
                                        </p>
                                    ) : null}
                                </div>
                                <Button
                                    variant="destructive"
                                    disabled={
                                        submitting ||
                                        !server.allowed_actions.reinstall
                                    }
                                    onClick={() => setConfirmOpen(true)}
                                >
                                    <RotateCcw />
                                    Reinstall
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Reinstall {server.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete the current server files and run a
                            full reinstall. The action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={submitting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-white hover:bg-destructive/90"
                            disabled={submitting}
                            onClick={(event) => {
                                event.preventDefault();
                                void requestReinstall();
                            }}
                        >
                            {submitting && <Spinner />}
                            Reinstall server
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
