import { Head } from "@inertiajs/react";
import { FolderTree } from "lucide-react";
import { show as serverConsole } from "@/actions/App/Http/Controllers/Client/ServerConsoleController";
import { show as serverFilesystem } from "@/actions/App/Http/Controllers/Client/ServerFilesystemController";
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

export default function ServerFilesystem({ server }: Props) {
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
            title: "Filesystem",
            href: serverFilesystem(server.id),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${server.name} Filesystem`} />
            <div className="flex h-full flex-1 flex-col gap-6 px-4 py-6">
                <section className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
                    <div className="border-b border-border/60 bg-muted/20 px-5 py-5 sm:px-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-xl font-semibold tracking-tight">
                                {server.name}
                            </h1>
                            <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${statusTone(server.status)}`}
                            >
                                {statusLabel(server.status)}
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Browse and manage server files from a dedicated
                            workspace.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
                            <span>{server.name}</span>
                            <span>{server.cargo.name}</span>
                            <span>{formatServerAddress(server)}</span>
                        </div>
                    </div>

                    <div className="px-5 py-10 sm:px-6">
                        <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-5 py-8">
                            <div className="rounded-xl bg-muted p-3">
                                <FolderTree className="h-5 w-5 text-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-base font-semibold text-foreground">
                                    Filesystem workspace
                                </h2>
                                <p className="max-w-2xl text-sm text-muted-foreground">
                                    This tab is now part of the server
                                    navigation. The file browser itself has not
                                    been built yet, but the route and layout are
                                    in place so the server section is structured
                                    correctly.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </AppLayout>
    );
}
