import { Head, router, useForm } from "@inertiajs/react";
import { Download, Ellipsis, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Column, PaginatedData } from "@/components/admin/data-table";
import { ConfirmDeleteDialog, DataTable } from "@/components/admin/data-table";
import InputError from "@/components/input-error";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogContentFull,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaceholderPattern } from "@/components/ui/placeholder-pattern";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Tab } from "@/components/ui/sliding-tabs";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import { toast } from "@/components/ui/sonner";
import { Spinner } from "@/components/ui/spinner";
import AdminLayout from "@/layouts/admin/layout";
import AppLayout from "@/layouts/app-layout";
import { formatDate } from "@/lib/format";
import { formatServerAddress } from "@/lib/server-runtime";
import { cn } from "@/lib/utils";
import {
	index as adminServers,
	bulkDestroy,
	destroy,
	installLog as downloadInstallLog,
	reinstall,
	store,
	transfer as transferRoute,
	update,
	updateStartup as updateStartupRoute,
} from "@/routes/admin/servers";
import { cancel as cancelTransferRoute } from "@/routes/admin/servers/transfer";
import type { BreadcrumbItem } from "@/types";

type UserOption = {
	id: number;
	name: string;
	email: string;
};

type NodeOption = {
	id: number;
	name: string;
};

type CargoOption = {
	id: number;
	name: string;
};

type AllocationOption = {
	id: number;
	node_id: number;
	bind_ip: string;
	port: number;
	ip_alias: string | null;
	server_id: number | null;
};

type AdminServer = {
	id: number;
	name: string;
	memory_mib: number;
	cpu_limit: number;
	disk_mib: number;
	backup_limit: number;
	allocation_limit: number | null;
	transfer: {
		id: number;
		status: string;
		progress: number;
		source_node: string;
		target_node: string;
	} | null;
	startup_command: string;
	startup_command_override: string | null;
	docker_image_override: string | null;
	docker_image: string | null;
	status: string;
	last_error: string | null;
	created_at: string;
	updated_at: string;
	allocation: Omit<AllocationOption, "node_id" | "server_id"> | null;
	user: UserOption;
	node: NodeOption;
	cargo: CargoOption;
};

type Props = {
	servers: PaginatedData<AdminServer>;
	users: UserOption[];
	nodes: NodeOption[];
	allocations: AllocationOption[];
	cargo: CargoOption[];
	filters: { search: string };
};

type ServerFormData = {
	name: string;
	user_id: number | "";
	node_id: number | "";
	cargo_id: number | "";
	allocation_id: number | "";
	memory_mib: number;
	cpu_limit: number;
	disk_mib: number;
	backup_limit: number;
	allocation_limit: number | "";
};

const breadcrumbs: BreadcrumbItem[] = [
	{ title: "Admin", href: adminServers.url() },
	{ title: "Servers", href: adminServers.url() },
];

const tabs: Tab[] = [
	{ id: "overview", label: "Overview" },
	{ id: "edit", label: "Edit" },
	{ id: "startup", label: "Startup" },
	{ id: "transfer", label: "Transfer" },
	{ id: "danger", label: "Danger" },
];

function formatLimit(value: number, suffix: string): string {
	return `${value.toLocaleString()} ${suffix}`;
}

function formatCpuLimit(value: number): string {
	return value === 0 ? "Unlimited" : `${value}%`;
}

function statusLabel(status: string): string {
	switch (status) {
		case "running":
			return "Running";
		case "installing":
			return "Installing";
		case "starting":
			return "Starting";
		case "offline":
			return "Offline";
		case "install_failed":
			return "Install failed";
		default:
			return "Installing";
	}
}

function StackedStatCard({
	label,
	value,
	description,
	valueClassName,
}: {
	label: string;
	value: string;
	description?: string;
	valueClassName?: string;
}) {
	return (
		<div className="overflow-hidden rounded-lg bg-muted/40">
			<div className="px-4 py-2.5">
				<span className="text-xs font-medium text-muted-foreground">
					{label}
				</span>
			</div>
			<div className="rounded-lg border border-border/70 bg-background p-5">
				<p
					className={cn(
						"text-3xl font-semibold text-foreground",
						valueClassName,
					)}
				>
					{value}
				</p>
				{description ? (
					<p className="mt-1 text-xs text-muted-foreground">{description}</p>
				) : null}
			</div>
		</div>
	);
}

function OptionSelect({
	value,
	onChange,
	options,
	placeholder,
	renderLabel,
	renderDescription,
	disabled = false,
}: {
	value: number | "";
	onChange: (value: number) => void;
	options: Array<{ id: number }>;
	placeholder: string;
	renderLabel: (option: any) => string;
	renderDescription?: (option: any) => string | undefined;
	disabled?: boolean;
}) {
	const searchableOptions = options.map((option) => ({
		value: String(option.id),
		label: renderLabel(option),
		description: renderDescription?.(option),
	}));

	return (
		<SearchableSelect
			options={searchableOptions}
			value={value === "" ? "" : String(value)}
			onValueChange={(v) => onChange(Number(v))}
			placeholder={placeholder}
			disabled={disabled}
		/>
	);
}

function ServerFormFields({
	data,
	setData,
	errors,
	users,
	nodes,
	allocations,
	cargo,
	lockPlacement,
}: {
	data: ServerFormData;
	setData: <K extends keyof ServerFormData>(
		key: K,
		value: ServerFormData[K],
	) => void;
	errors: Partial<Record<keyof ServerFormData, string>>;
	users: UserOption[];
	nodes: NodeOption[];
	allocations: AllocationOption[];
	cargo: CargoOption[];
	lockPlacement?: boolean;
}) {
	const availableAllocations = allocations.filter(
		(allocation) =>
			allocation.node_id === data.node_id &&
			(allocation.server_id === null || allocation.id === data.allocation_id),
	);

	return (
		<div className="grid gap-4">
			<div className="grid gap-2">
				<Label htmlFor="server-name">Name</Label>
				<Input
					id="server-name"
					value={data.name}
					onChange={(event) => setData("name", event.target.value)}
					placeholder="Paper Survival"
					required
				/>
				<InputError message={errors.name} />
			</div>

			<div className="grid gap-2">
				<Label htmlFor="server-user">User</Label>
				<OptionSelect
					value={data.user_id}
					onChange={(value) => setData("user_id", value)}
					options={users}
					placeholder="Choose a user"
					renderLabel={(user: UserOption) => user.name}
					renderDescription={(user: UserOption) => user.email}
				/>
				<InputError message={errors.user_id} />
			</div>

			<div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
				<div className="grid gap-2">
					<Label htmlFor="server-node">Node</Label>
					<OptionSelect
						value={data.node_id}
						onChange={(value) => {
							setData("node_id", value);
							setData("allocation_id", "");
						}}
						options={nodes}
						placeholder="Choose a node"
						renderLabel={(node: NodeOption) => node.name}
						disabled={lockPlacement}
					/>
					<InputError message={errors.node_id} />
				</div>
				<div className="grid gap-2">
					<Label htmlFor="server-cargo">Cargo</Label>
					<OptionSelect
						value={data.cargo_id}
						onChange={(value) => setData("cargo_id", value)}
						options={cargo}
						placeholder="Choose a cargo"
						renderLabel={(cargoItem: CargoOption) => cargoItem.name}
						disabled={lockPlacement}
					/>
					<InputError message={errors.cargo_id} />
				</div>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="server-allocation">Primary allocation</Label>
				<OptionSelect
					value={data.allocation_id}
					onChange={(value) => setData("allocation_id", value)}
					options={availableAllocations}
					placeholder={
						data.node_id === "" ? "Choose a node first" : "Choose an allocation"
					}
					renderLabel={(allocation: AllocationOption) =>
						`${allocation.ip_alias ?? allocation.bind_ip}:${allocation.port}`
					}
				/>
				<InputError message={errors.allocation_id} />
			</div>

			<div className="grid gap-2 sm:grid-cols-3 sm:gap-4">
				<div className="grid gap-2">
					<Label htmlFor="server-memory">Memory (MiB)</Label>
					<Input
						id="server-memory"
						type="number"
						min={1}
						value={data.memory_mib}
						onChange={(event) =>
							setData("memory_mib", Number(event.target.value))
						}
						required
					/>
					<InputError message={errors.memory_mib} />
				</div>
				<div className="grid gap-2">
					<Label htmlFor="server-cpu">CPU (%)</Label>
					<Input
						id="server-cpu"
						type="number"
						min={0}
						value={data.cpu_limit}
						onChange={(event) =>
							setData("cpu_limit", Number(event.target.value))
						}
						required
					/>
					<InputError message={errors.cpu_limit} />
				</div>
				<div className="grid gap-2">
					<Label htmlFor="server-disk">Disk (MiB)</Label>
					<Input
						id="server-disk"
						type="number"
						min={1}
						value={data.disk_mib}
						onChange={(event) =>
							setData("disk_mib", Number(event.target.value))
						}
						required
					/>
					<InputError message={errors.disk_mib} />
				</div>
				<div className="grid gap-2">
					<Label htmlFor="server-backup-limit">Backup limit</Label>
					<Input
						id="server-backup-limit"
						type="number"
						min={0}
						value={data.backup_limit}
						onChange={(event) =>
							setData("backup_limit", Number(event.target.value))
						}
						required
					/>
					<p className="text-xs text-muted-foreground">0 = backups disabled</p>
					<InputError message={errors.backup_limit} />
				</div>
				<div className="grid gap-2">
					<Label htmlFor="server-alloc-limit">Extra allocation limit</Label>
					<Input
						id="server-alloc-limit"
						type="number"
						min={0}
						value={data.allocation_limit}
						onChange={(event) =>
							setData(
								"allocation_limit",
								event.target.value === "" ? "" : Number(event.target.value),
							)
						}
						placeholder="Use global setting"
					/>
					<p className="text-xs text-muted-foreground">
						Leave empty to use the global limit from settings.
					</p>
					<InputError message={errors.allocation_limit} />
				</div>
			</div>
		</div>
	);
}

function CreateServerModal({
	users,
	nodes,
	allocations,
	cargo,
	onClose,
}: {
	users: UserOption[];
	nodes: NodeOption[];
	allocations: AllocationOption[];
	cargo: CargoOption[];
	onClose: () => void;
}) {
	const form = useForm<ServerFormData>({
		name: "",
		user_id: users[0]?.id ?? "",
		node_id: nodes[0]?.id ?? "",
		cargo_id: cargo[0]?.id ?? "",
		allocation_id: "",
		memory_mib: 2048,
		cpu_limit: 100,
		disk_mib: 10240,
		backup_limit: 0,
		allocation_limit: "",
	});
	const minimumMs = 500;
	const submitStart = useRef(0);
	const [submitting, setSubmitting] = useState(false);

	const submit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		form.post(store.url(), {
			preserveScroll: true,
			onStart: () => {
				submitStart.current = Date.now();
				setSubmitting(true);
			},
			onFinish: () => {
				const remaining = minimumMs - (Date.now() - submitStart.current);
				setTimeout(() => setSubmitting(false), Math.max(0, remaining));
			},
			onSuccess: () => {
				toast.success("Server created");
				onClose();
			},
			onError: (errors) => {
				Object.values(errors).forEach((message) => {
					toast.error(message);
				});
			},
		});
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Create server</DialogTitle>
				</DialogHeader>

				<form onSubmit={submit} className="space-y-4">
					<ServerFormFields
						data={form.data}
						setData={form.setData}
						errors={form.errors}
						users={users}
						nodes={nodes}
						allocations={allocations}
						cargo={cargo}
					/>

					<div className="flex justify-end">
						<Button type="submit" disabled={submitting || form.processing}>
							{(submitting || form.processing) && <Spinner />}
							Create server
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function TransferTab({
	server,
	nodes,
	allocations,
}: {
	server: AdminServer;
	nodes: NodeOption[];
	allocations: AllocationOption[];
}) {
	const [targetNodeId, setTargetNodeId] = useState<string>("");
	const [targetAllocationId, setTargetAllocationId] = useState<string>("");
	const [submitting, setSubmitting] = useState(false);
	const [cancelling, setCancelling] = useState(false);

	const targetAllocations = allocations.filter(
		(a) => a.node_id === Number(targetNodeId) && !a.server_id,
	);

	const otherNodes = nodes.filter((n) => n.id !== server.node.id);

	const handleTransfer = () => {
		setSubmitting(true);
		router.post(
			transferRoute.url(server.id),
			{
				target_node_id: Number(targetNodeId),
				target_allocation_id: Number(targetAllocationId),
			},
			{
				preserveScroll: true,
				onSuccess: () => toast.success("Transfer initiated."),
				onError: (errors) =>
					Object.values(errors).forEach((m) => {
						toast.error(m);
					}),
				onFinish: () => setSubmitting(false),
			},
		);
	};

	const handleCancel = () => {
		setCancelling(true);
		router.post(
			cancelTransferRoute.url(server.id),
			{},
			{
				preserveScroll: true,
				onSuccess: () => toast.success("Transfer cancelled."),
				onError: (errors) =>
					Object.values(errors).forEach((m) => {
						toast.error(m);
					}),
				onFinish: () => setCancelling(false),
			},
		);
	};

	if (server.transfer) {
		return (
			<div className="max-w-xl space-y-4">
				<div className="rounded-lg border border-border/70 bg-muted/20 p-5">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-foreground">
								Transfer in progress
							</p>
							<p className="mt-0.5 text-xs text-muted-foreground">
								{server.transfer.source_node} → {server.transfer.target_node}
							</p>
						</div>
						<span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
							<Spinner className="h-3 w-3" />
							{server.transfer.status}
						</span>
					</div>
					<div className="mt-4">
						<div className="h-2 overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-primary transition-all duration-500"
								style={{ width: `${server.transfer.progress}%` }}
							/>
						</div>
						<p className="mt-1.5 text-xs text-muted-foreground">
							{server.transfer.progress}% complete
						</p>
					</div>
					<div className="mt-4">
						<Button
							variant="secondary"
							size="sm"
							onClick={handleCancel}
							disabled={cancelling}
						>
							{cancelling && <Spinner />}
							Cancel transfer
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-xl space-y-4">
			<div className="grid gap-2">
				<Label>Current node</Label>
				<Input value={server.node.name} disabled />
			</div>
			<div className="grid gap-2">
				<Label>Target node</Label>
				<SearchableSelect
					options={otherNodes.map((n) => ({
						value: String(n.id),
						label: n.name,
					}))}
					value={targetNodeId}
					onValueChange={(v) => {
						setTargetNodeId(v);
						setTargetAllocationId("");
					}}
					placeholder="Select a node"
					searchPlaceholder="Search nodes…"
				/>
			</div>
			{targetNodeId && (
				<div className="grid gap-2">
					<Label>Target allocation</Label>
					<Select
						value={targetAllocationId}
						onValueChange={setTargetAllocationId}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select an allocation" />
						</SelectTrigger>
						<SelectContent>
							{targetAllocations.length > 0 ? (
								targetAllocations.map((a) => (
									<SelectItem key={a.id} value={String(a.id)}>
										{a.bind_ip}:{a.port}
										{a.ip_alias ? ` (${a.ip_alias})` : ""}
									</SelectItem>
								))
							) : (
								<SelectItem value="none" disabled>
									No available allocations
								</SelectItem>
							)}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						Only unassigned allocations are shown.
					</p>
				</div>
			)}
			<Button
				onClick={handleTransfer}
				disabled={!targetNodeId || !targetAllocationId || submitting}
			>
				{submitting && <Spinner />}
				Start transfer
			</Button>
		</div>
	);
}

function StartupTab({ server }: { server: AdminServer }) {
	const startupForm = useForm({
		startup_command_override: server.startup_command_override ?? "",
		docker_image_override: server.docker_image_override ?? "",
	});
	const minimumMs = 500;
	const startupSubmitStart = useRef(0);
	const [savingStartup, setSavingStartup] = useState(false);

	const submitStartup = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		startupForm.patch(updateStartupRoute.url(server.id), {
			preserveScroll: true,
			onStart: () => {
				startupSubmitStart.current = Date.now();
				setSavingStartup(true);
			},
			onFinish: () => {
				const remaining = minimumMs - (Date.now() - startupSubmitStart.current);
				setTimeout(() => setSavingStartup(false), Math.max(0, remaining));
			},
			onSuccess: () => {
				startupForm.setDefaults();
				toast.success("Startup overrides updated");
			},
			onError: (errors) => {
				Object.values(errors).forEach((message) => {
					toast.error(message);
				});
			},
		});
	};

	return (
		<form onSubmit={submitStartup} className="max-w-2xl space-y-6">
			<div className="space-y-4">
				{server.startup_command ? (
					<div className="grid gap-2">
						<Label>Default startup command</Label>
						<code className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
							{server.startup_command}
						</code>
						<p className="text-xs text-muted-foreground">
							This is the cargo's default. Override it below if needed.
						</p>
					</div>
				) : null}

				<div className="grid gap-2">
					<Label htmlFor="startup-override">Startup command override</Label>
					<Input
						id="startup-override"
						value={startupForm.data.startup_command_override}
						onChange={(event) =>
							startupForm.setData(
								"startup_command_override",
								event.target.value,
							)
						}
						placeholder="Leave empty to use cargo default"
					/>
					<InputError message={startupForm.errors.startup_command_override} />
					<p className="text-xs text-muted-foreground">
						Leave empty to use the cargo's default startup command. This will be
						shown to the user as read-only.
					</p>
				</div>

				<div className="grid gap-2">
					<Label htmlFor="docker-image-override">Docker image override</Label>
					<Input
						id="docker-image-override"
						value={startupForm.data.docker_image_override}
						onChange={(event) =>
							startupForm.setData("docker_image_override", event.target.value)
						}
						placeholder="Leave empty to use user's selection"
					/>
					<InputError message={startupForm.errors.docker_image_override} />
					<p className="text-xs text-muted-foreground">
						Leave empty to let the user choose from the cargo's images. When
						set, this takes priority over the user's choice.
					</p>
				</div>
			</div>

			<div className="flex items-center gap-4">
				<Button
					type="submit"
					disabled={
						savingStartup || startupForm.processing || !startupForm.isDirty
					}
				>
					{(savingStartup || startupForm.processing) && <Spinner />}
					Save startup overrides
				</Button>
			</div>
		</form>
	);
}

function ServerModal({
	server,
	users,
	nodes,
	allocations,
	cargo,
	onClose,
	onDelete,
}: {
	server: AdminServer;
	users: UserOption[];
	nodes: NodeOption[];
	allocations: AllocationOption[];
	cargo: CargoOption[];
	onClose: () => void;
	onDelete: (server: AdminServer) => void;
}) {
	const [tab, setTab] = useState("overview");
	const [confirmingReinstall, setConfirmingReinstall] = useState(false);
	const [reinstalling, setReinstalling] = useState(false);
	const form = useForm<ServerFormData>({
		name: server.name,
		user_id: server.user.id,
		node_id: server.node.id,
		cargo_id: server.cargo.id,
		allocation_id: server.allocation?.id ?? "",
		memory_mib: server.memory_mib,
		cpu_limit: server.cpu_limit,
		disk_mib: server.disk_mib,
		backup_limit: server.backup_limit,
		allocation_limit: server.allocation_limit ?? "",
	});
	const minimumMs = 500;
	const submitStart = useRef(0);
	const [submitting, setSubmitting] = useState(false);

	const submit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		form.patch(update.url(server.id), {
			preserveScroll: true,
			onStart: () => {
				submitStart.current = Date.now();
				setSubmitting(true);
			},
			onFinish: () => {
				const remaining = minimumMs - (Date.now() - submitStart.current);
				setTimeout(() => setSubmitting(false), Math.max(0, remaining));
			},
			onSuccess: () => {
				toast.success("Server updated");
			},
			onError: (errors) => {
				Object.values(errors).forEach((message) => {
					toast.error(message);
				});
			},
		});
	};

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContentFull>
				<div className="px-8 pt-8 pb-4">
					<div className="min-w-0">
						<DialogTitle className="text-lg">{server.name}</DialogTitle>
						<p className="text-sm text-muted-foreground">
							Owned by {server.user.name}
						</p>
					</div>
					<div className="mt-6">
						<SlidingTabs tabs={tabs} active={tab} onChange={setTab} />
					</div>
				</div>

				<div className="border-t border-border/60" />

				<div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-6">
					{tab === "overview" ? (
						<div className="space-y-4">
							{server.status === "install_failed" ? (
								<div className="relative overflow-hidden rounded-lg border border-brand/30 bg-brand/8 px-4 py-3">
									<PlaceholderPattern
										patternSize={8}
										className="pointer-events-none absolute inset-0 size-full stroke-brand opacity-[0.12]"
									/>
									<div className="flex items-start justify-between gap-4">
										<div>
											<p className="text-sm font-semibold text-brand dark:text-[#ff8a6b]">
												This server cannot be recovered automatically.
											</p>
											<p className="mt-1 text-sm text-muted-foreground">
												The daemon reported an install failure. Download the
												install log, then trigger a force reinstall to rebuild
												the server from scratch.
											</p>
										</div>
										<div className="flex shrink-0 gap-2">
											<a
												href={downloadInstallLog.url(server.id)}
												className={buttonVariants({
													size: "table",
													variant: "outline",
												})}
											>
												<Download className="h-3.5 w-3.5" />
												Download install log
											</a>
											<Button
												size="table"
												variant="destructive"
												disabled={reinstalling}
												onClick={() => setConfirmingReinstall(true)}
											>
												{reinstalling && <Spinner />}
												<RotateCcw className="h-3.5 w-3.5" />
												Force reinstall
											</Button>
										</div>
									</div>
									{server.last_error ? (
										<p className="mt-3 rounded-md bg-background/80 px-3 py-2 font-mono text-xs text-foreground">
											{server.last_error}
										</p>
									) : null}
								</div>
							) : null}

							<div className="flex gap-6">
								<div className="min-w-0 flex-1 space-y-1">
									{[
										{
											label: "Server ID",
											value: `#${server.id}`,
										},
										{ label: "Name", value: server.name },
										{
											label: "User",
											value: server.user.name,
										},
										{
											label: "Node",
											value: server.node.name,
										},
										{
											label: "Cargo",
											value: server.cargo.name,
										},
										{
											label: "Allocation",
											value: formatServerAddress(server.allocation),
										},
										{
											label: "Memory",
											value: formatLimit(server.memory_mib, "MiB"),
										},
										{
											label: "CPU",
											value: formatCpuLimit(server.cpu_limit),
										},
										{
											label: "Disk",
											value: formatLimit(server.disk_mib, "MiB"),
										},
										{
											label: "Created",
											value: formatDate(server.created_at, true),
										},
										{
											label: "Last updated",
											value: formatDate(server.updated_at, true),
										},
									].map((item) => (
										<div
											key={item.label}
											className="flex items-center justify-between gap-4 rounded-md px-3 py-2.5"
										>
											<span className="text-sm text-muted-foreground">
												{item.label}
											</span>
											<span className="max-w-[70%] truncate text-right text-sm font-medium text-foreground">
												{item.value}
											</span>
										</div>
									))}
								</div>

								<div className="w-[320px] shrink-0 space-y-3">
									<StackedStatCard
										label="Status"
										value={statusLabel(server.status)}
										description={
											server.status === "install_failed"
												? "Download the install log or force a reinstall."
												: "Last known state. It's possible that it may be wrong, especially if the daemon is offline."
										}
										valueClassName={
											server.status === "install_failed"
												? "text-brand dark:text-[#ff8a6b]"
												: server.status === "running"
													? "text-emerald-600 dark:text-emerald-400"
													: undefined
										}
									/>
								</div>
							</div>
						</div>
					) : null}

					{tab === "edit" ? (
						<div className="max-w-3xl space-y-4">
							<div>
								<h3 className="text-sm font-semibold text-foreground">
									Server configuration
								</h3>
								<p className="mt-1 text-xs text-muted-foreground">
									Update ownership, primary allocation, and resource limits.
								</p>
							</div>

							<form onSubmit={submit} className="space-y-4">
								<div className="relative overflow-hidden rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
									<PlaceholderPattern
										patternSize={8}
										className="pointer-events-none absolute inset-0 size-full stroke-current opacity-[0.08]"
									/>
									<div className="relative">
										Node and Cargo cannot be changed after a server is created
										(at the moment!). Resource updates are applied immediately
										if the server is offline, or queued until the next restart.
									</div>
								</div>
								<ServerFormFields
									data={form.data}
									setData={form.setData}
									errors={form.errors}
									users={users}
									nodes={nodes}
									allocations={allocations}
									cargo={cargo}
									lockPlacement
								/>

								<div className="flex justify-end">
									<Button
										type="submit"
										disabled={submitting || form.processing}
									>
										{(submitting || form.processing) && <Spinner />}
										Save changes
									</Button>
								</div>
							</form>
						</div>
					) : null}

					{tab === "startup" ? <StartupTab server={server} /> : null}

					{tab === "transfer" ? (
						<TransferTab
							server={server}
							nodes={nodes}
							allocations={allocations}
						/>
					) : null}

					{tab === "danger" ? (
						<div className="max-w-xl space-y-4">
							<div className="overflow-hidden rounded-lg bg-muted/40">
								<div className="px-4 py-2.5">
									<span className="text-xs font-medium text-muted-foreground">
										Danger zone
									</span>
								</div>
								<div className="rounded-lg border border-border/70 bg-background p-5">
									<div className="flex items-center justify-between gap-4 border-b border-border/60 pb-5">
										<div>
											<h3 className="text-sm font-semibold text-foreground">
												Force reinstall
											</h3>
											<p className="mt-1 text-sm text-muted-foreground">
												Delete the server files and run the Skyport Cargo
												installer again.
											</p>
										</div>
										<Button
											variant="destructive"
											className="cursor-pointer"
											disabled={reinstalling}
											onClick={() => setConfirmingReinstall(true)}
										>
											{reinstalling && <Spinner />}
											<RotateCcw className="h-4 w-4" />
											Force reinstall
										</Button>
									</div>

									<div className="flex items-center justify-between gap-4">
										<div>
											<h3 className="text-sm font-semibold text-foreground">
												Delete server
											</h3>
											<p className="mt-1 text-sm text-muted-foreground">
												Permanently remove this server from the panel. If the
												daemon is down, the server will be force deleted from
												the panel but not from the node.
											</p>
										</div>
									<Button
										variant="destructive"
										className="shrink-0 cursor-pointer"
										onClick={() => onDelete(server)}
									>
										<Trash2 className="h-4 w-4" />
										Delete
									</Button>
									</div>
								</div>
							</div>
						</div>
					) : null}
				</div>
			</DialogContentFull>

			<ConfirmDeleteDialog
				open={confirmingReinstall}
				onOpenChange={setConfirmingReinstall}
				title={`Force reinstall ${server.name}?`}
				description="This will delete the current server files and rerun the cargo installer. The server will start automatically after a successful reinstall."
				loading={reinstalling}
				confirmLabel="Force reinstall"
				onConfirm={() => {
					setReinstalling(true);
					router.post(
						reinstall.url(server.id),
						{},
						{
							preserveScroll: true,
							onSuccess: () => {
								toast.success(`${server.name} reinstall requested`);
								setConfirmingReinstall(false);
							},
							onFinish: () => setReinstalling(false),
						},
					);
				}}
			/>
		</Dialog>
	);
}

export default function Servers({
	servers,
	users,
	nodes,
	allocations,
	cargo,
	filters,
}: Props) {
	const [search, setSearch] = useState(filters.search);
	const [creatingServer, setCreatingServer] = useState(false);
	const [viewingServer, setViewingServer] = useState<AdminServer | null>(null);
	const [deletingServer, setDeletingServer] = useState<AdminServer | null>(
		null,
	);
	const [singleDeleting, setSingleDeleting] = useState(false);

	useEffect(() => {
		router.reload({ only: ["allocations", "nodes", "users", "cargo"] });
	}, []);

	const navigate = (params: Record<string, string | undefined>) => {
		router.get(adminServers.url(), params as Record<string, string>, {
			preserveState: true,
			replace: true,
		});
	};

	const handleSearch = (value: string) => {
		setSearch(value);
		navigate({ search: value || undefined });
	};

	const serverMap = useMemo(
		() => new Map(servers.data.map((item) => [item.id, item])),
		[servers.data],
	);

	const columns: Column<AdminServer>[] = [
		{
			label: "Server",
			width: "w-[34%]",
			render: (server) => (
				<div className="min-w-0">
					<p className="truncate text-sm font-medium text-foreground">
						{server.name}
					</p>
					<p className="truncate text-xs text-muted-foreground">#{server.id}</p>
				</div>
			),
		},
		{
			label: "User",
			width: "w-[24%]",
			render: (server) => (
				<div className="min-w-0">
					<p className="truncate text-sm text-foreground">{server.user.name}</p>
					<p className="truncate text-xs text-muted-foreground">
						{server.user.email}
					</p>
				</div>
			),
		},
		{
			label: "Node / Cargo",
			width: "flex-1 min-w-0",
			render: (server) => (
				<div className="text-xs text-muted-foreground">
					<p>{server.node.name}</p>
					<p>{server.cargo.name}</p>
				</div>
			),
		},
	];

	const rowMenu = (server: AdminServer) => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all duration-150 ease-out hover:bg-muted hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
				>
					<Ellipsis className="h-4 w-4" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-44">
				<DropdownMenuItem
					className="cursor-pointer"
					onSelect={() => setDeletingServer(server)}
				>
					<Trash2 className="mr-2 h-4 w-4" />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);

	return (
		<AppLayout breadcrumbs={breadcrumbs}>
			<Head title="Admin — Servers" />

			<AdminLayout
				title="Servers"
				description="Manage all servers that are available on the system."
			>
				<DataTable
					data={servers}
					columns={columns}
					searchValue={search}
					onSearch={handleSearch}
					onRowClick={(server) =>
						setViewingServer(serverMap.get(server.id) ?? server)
					}
					rowMenu={rowMenu}
					bulkDeleteUrl={bulkDestroy.url()}
					entityName="server"
					emptyMessage="No servers found"
					actions={
						<Button size="table" onClick={() => setCreatingServer(true)}>
							<Plus className="h-3.5 w-3.5" />
							Create new
						</Button>
					}
				/>
			</AdminLayout>

			{creatingServer ? (
				<CreateServerModal
					users={users}
					nodes={nodes}
					allocations={allocations}
					cargo={cargo}
					onClose={() => setCreatingServer(false)}
				/>
			) : null}

			{viewingServer ? (
				<ServerModal
					server={viewingServer}
					users={users}
					nodes={nodes}
					allocations={allocations}
					cargo={cargo}
					onClose={() => setViewingServer(null)}
					onDelete={setDeletingServer}
				/>
			) : null}

			<ConfirmDeleteDialog
				open={deletingServer !== null}
				onOpenChange={(open) => {
					if (!open) {
						setDeletingServer(null);
					}
				}}
				title={`Delete ${deletingServer?.name ?? "server"}?`}
				description="This action cannot be undone. The selected server will be permanently removed."
				loading={singleDeleting}
				onConfirm={() => {
					if (!deletingServer) {
						return;
					}

					setSingleDeleting(true);
					router.delete(destroy.url(deletingServer.id), {
						onSuccess: () => {
							toast.success(`${deletingServer.name} deleted`);
							setViewingServer(null);
							setDeletingServer(null);
						},
						onFinish: () => setSingleDeleting(false),
					});
				}}
			/>
		</AppLayout>
	);
}
