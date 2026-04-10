import { Head, router, useForm } from "@inertiajs/react";
import {
	Archive,
	Clock,
	Download,
	HardDrive,
	Plus,
	RotateCcw,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	destroy,
	download,
	restore,
	store,
} from "@/actions/App/Http/Controllers/Client/ServerBackupsController";
import Heading from "@/components/heading";
import InputError from "@/components/input-error";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaceholderPattern } from "@/components/ui/placeholder-pattern";
import { toast } from "@/components/ui/sonner";
import { Spinner } from "@/components/ui/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import AppLayout from "@/layouts/app-layout";
import { home } from "@/routes";
import { console as serverConsole } from "@/routes/client/servers";
import type { BreadcrumbItem } from "@/types";

type BackupEntry = {
	id: number;
	name: string;
	uuid: string;
	size_bytes: number;
	checksum: string | null;
	status: "creating" | "completed" | "failed" | "restoring";
	error: string | null;
	completed_at: string | null;
	created_at: string | null;
};

type Props = {
	server: {
		id: number;
		name: string;
		status: string;
		backup_limit: number;
	};
	backups: BackupEntry[];
};

function formatSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const units = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** i).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function formatDate(iso: string | null): string {
	if (!iso) return "—";
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(iso));
}

function BackupStatusBadge({ status }: { status: BackupEntry["status"] }) {
	if (status === "creating") {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="inline-flex shrink-0 items-center">
						<Spinner className="h-3.5 w-3.5 text-muted-foreground" />
					</span>
				</TooltipTrigger>
				<TooltipContent>Creating backup…</TooltipContent>
			</Tooltip>
		);
	}

	if (status === "restoring") {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="inline-flex shrink-0 items-center">
						<Spinner className="h-3.5 w-3.5 text-muted-foreground" />
					</span>
				</TooltipTrigger>
				<TooltipContent>Restoring backup…</TooltipContent>
			</Tooltip>
		);
	}

	if (status === "failed") {
		return (
			<span className="inline-flex shrink-0 items-center rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
				Failed
			</span>
		);
	}

	return null;
}

function BackupCard({
	backup,
	serverId,
}: {
	backup: BackupEntry;
	serverId: number;
}) {
	const [deleting, setDeleting] = useState(false);
	const [restoring, setRestoring] = useState(false);
	const isActionable = backup.status === "completed";
	const _isInProgress =
		backup.status === "creating" || backup.status === "restoring";

	const handleRestore = () => {
		setRestoring(true);
		router.post(
			restore.url({ server: serverId, backup: backup.id }),
			{},
			{
				preserveScroll: true,
				onSuccess: () => toast.success("Restore started."),
				onError: (errors) =>
					Object.values(errors).forEach((m) => {
						toast.error(m);
					}),
				onFinish: () => setRestoring(false),
			},
		);
	};

	const handleDelete = () => {
		setDeleting(true);
		router.delete(destroy.url({ server: serverId, backup: backup.id }), {
			preserveScroll: true,
			onSuccess: () => toast.success("Backup deleted."),
			onError: (errors) =>
				Object.values(errors).forEach((m) => {
					toast.error(m);
				}),
			onFinish: () => setDeleting(false),
		});
	};

	return (
		<div className="group relative flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-1 py-1">
			<div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background text-muted-foreground shadow-xs ring-1 ring-border/60">
				<PlaceholderPattern
					patternSize={4}
					className="pointer-events-none absolute inset-0 size-full stroke-current opacity-[0.12]"
				/>
				<Archive className="relative h-4 w-4" />
			</div>
			<div className="min-w-0 flex-1 pl-2">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-foreground truncate">
						{backup.name}
					</span>
					<BackupStatusBadge status={backup.status} />
				</div>
				<div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
					{backup.size_bytes > 0 && (
						<span className="flex items-center gap-1">
							<HardDrive className="h-3 w-3" />
							{formatSize(backup.size_bytes)}
						</span>
					)}
					<span className="flex items-center gap-1">
						<Clock className="h-3 w-3" />
						{formatDate(backup.created_at)}
					</span>
					{backup.error && (
						<span className="text-red-500 truncate">{backup.error}</span>
					)}
				</div>
			</div>
			<div className="flex items-center gap-1 pr-2">
				{isActionable && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-muted-foreground"
								onClick={() =>
									window.open(
										download.url({
											server: serverId,
											backup: backup.id,
										}),
										"_self",
									)
								}
							>
								<Download className="h-3.5 w-3.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Download backup</TooltipContent>
					</Tooltip>
				)}
				{isActionable && (
					<AlertDialog>
						<Tooltip>
							<TooltipTrigger asChild>
								<AlertDialogTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-muted-foreground"
										disabled={restoring}
									>
										{restoring ? (
											<Spinner className="h-3.5 w-3.5" />
										) : (
											<RotateCcw className="h-3.5 w-3.5" />
										)}
									</Button>
								</AlertDialogTrigger>
							</TooltipTrigger>
							<TooltipContent>Restore backup</TooltipContent>
						</Tooltip>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Restore {backup.name}</AlertDialogTitle>
								<AlertDialogDescription>
									This will <strong>delete all current server files</strong> and
									replace them with this backup. This action cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={handleRestore}>
									Restore
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				)}
				<AlertDialog>
					<Tooltip>
						<TooltipTrigger asChild>
							<AlertDialogTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 text-muted-foreground"
									disabled={deleting}
								>
									{deleting ? (
										<Spinner className="h-3.5 w-3.5" />
									) : (
										<Trash2 className="h-3.5 w-3.5" />
									)}
								</Button>
							</AlertDialogTrigger>
						</TooltipTrigger>
						<TooltipContent>Delete backup</TooltipContent>
					</Tooltip>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete {backup.name}</AlertDialogTitle>
							<AlertDialogDescription>
								This backup will be permanently deleted and cannot be recovered.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction onClick={handleDelete}>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
}

function CreateBackupDialog({
	serverId,
	canCreate,
	backupLimit,
	currentCount,
}: {
	serverId: number;
	canCreate: boolean;
	backupLimit: number;
	currentCount: number;
}) {
	const [open, setOpen] = useState(false);
	const form = useForm({ name: "" });

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		form.post(store.url(serverId), {
			preserveScroll: true,
			onSuccess: () => {
				form.reset();
				setOpen(false);
				toast.success("Backup is being created.");
			},
			onError: (errors) =>
				Object.values(errors).forEach((m) => {
					toast.error(m);
				}),
		});
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					size="sm"
					disabled={!canCreate}
					title={
						!canCreate
							? backupLimit === 0
								? "Backups are disabled for this server"
								: `Backup limit of ${backupLimit} reached`
							: undefined
					}
				>
					<Plus className="h-4 w-4" />
					Create backup
				</Button>
			</DialogTrigger>
			<DialogContent>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Create backup</DialogTitle>
						<DialogDescription>
							Create a snapshot of this server's files.
							{backupLimit > 0 &&
								` ${currentCount} of ${backupLimit} backups used.`}
						</DialogDescription>
					</DialogHeader>
					<div className="mt-4 grid gap-2">
						<Label htmlFor="backup-name">Backup name</Label>
						<Input
							id="backup-name"
							value={form.data.name}
							onChange={(event) => form.setData("name", event.target.value)}
							placeholder={`Backup ${new Date().toLocaleDateString()}`}
							maxLength={255}
							required
						/>
						<InputError message={form.errors.name} />
					</div>
					<DialogFooter className="mt-6">
						<Button type="submit" disabled={form.processing}>
							{form.processing && <Spinner />}
							Create backup
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default function ServerBackups({ server, backups }: Props) {
	const hasInProgress = backups.some(
		(b) => b.status === "creating" || b.status === "restoring",
	);

	useEffect(() => {
		if (!hasInProgress) {
			return;
		}

		const interval = setInterval(() => {
			router.reload({ only: ["backups"] });
		}, 3000);

		return () => clearInterval(interval);
	}, [hasInProgress]);

	const breadcrumbs: BreadcrumbItem[] = [
		{ title: "Home", href: home() },
		{ title: server.name, href: serverConsole.url(server.id) },
		{ title: "Backups", href: `/server/${server.id}/backups` },
	];

	const completedCount = backups.filter(
		(b) => b.status === "completed" || b.status === "creating",
	).length;
	const canCreate =
		server.backup_limit > 0 && completedCount < server.backup_limit;

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title={`${server.name} — Backups`} />

			<div className="px-4 py-6">
				<Heading
					title="Backups"
					description="Create and restore snapshots of this server's files."
				/>

				<div className="space-y-4">
					<div className="rounded-md bg-sidebar p-1">
						<div className="rounded-md border border-sidebar-accent bg-background p-6">
							<div className="flex items-center justify-between">
								<Heading
									variant="small"
									title="Server backups"
									description={
										server.backup_limit === 0
											? "Backups are disabled for this server. Ask an administrator to increase the limit."
											: `${completedCount} of ${server.backup_limit} backups used.`
									}
								/>
								<CreateBackupDialog
									serverId={server.id}
									canCreate={canCreate}
									backupLimit={server.backup_limit}
									currentCount={completedCount}
								/>
							</div>

							{backups.length > 0 ? (
								<div className="mt-4 grid gap-2">
									{backups.map((backup) => (
										<BackupCard
											key={backup.id}
											backup={backup}
											serverId={server.id}
										/>
									))}
								</div>
							) : (
								<div className="mt-4 rounded-xl border border-dashed border-sidebar-border/70 px-4 py-6 text-center dark:border-sidebar-border">
									<p className="text-xs text-muted-foreground">
										{server.backup_limit === 0
											? "Backups are not enabled for this server."
											: "No backups yet. Create one to snapshot your server files."}
									</p>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</AppLayout>
	);
}
