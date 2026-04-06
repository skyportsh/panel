import { Head, router, useForm } from "@inertiajs/react";
import { Download, Ellipsis, FileUp, Plus, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
    bulkDestroy,
    destroy,
    importCargo,
    index as adminCargo,
    store,
    update,
} from "@/actions/App/Http/Controllers/Admin/CargoController";
import { ConfirmDeleteDialog, DataTable } from "@/components/admin/data-table";
import type { Column, PaginatedData } from "@/components/admin/data-table";
import CargoIcon from "@/components/cargo-icon";
import InputError from "@/components/input-error";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogContentFull,
    DialogDescription,
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
import { toast } from "@/components/ui/sonner";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import type { Tab } from "@/components/ui/sliding-tabs";
import { Spinner } from "@/components/ui/spinner";
import { useDialogState } from "@/hooks/use-dialog-state";
import AdminLayout from "@/layouts/admin/layout";
import AppLayout from "@/layouts/app-layout";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/types";

type CargoVariable = {
    name: string;
    description: string;
    env_variable: string;
    default_value: string;
    user_viewable: boolean;
    user_editable: boolean;
    rules: string;
    field_type: string;
};

type CargoDefinition = {
    _comment: string;
    meta: {
        version: string;
        source: string;
        source_format: "native" | "pterodactyl";
        update_url?: string | null;
    };
    exported_at: string;
    name: string;
    author: string;
    description: string;
    features: string[];
    docker_images: Record<string, string>;
    file_denylist: string[];
    startup: string;
    config: {
        files: string;
        startup: string;
        logs: string;
        stop: string;
    };
    scripts: {
        installation: {
            script: string;
            container: string;
            entrypoint: string;
        };
    };
    variables: CargoVariable[];
};

type AdminCargo = {
    id: number;
    name: string;
    slug: string;
    author: string;
    description: string;
    source_type: "native" | "pterodactyl";
    cargofile: string;
    definition: CargoDefinition;
    docker_images_count: number;
    variables_count: number;
    created_at: string;
    updated_at: string;
};

type Props = {
    cargo: PaginatedData<AdminCargo>;
    filters: { search: string };
};

type CreateCargoFormData = {
    name: string;
    author: string;
    description: string;
    startup: string;
};

type ImportCargoFormData = {
    content: string;
};

type EditCargoFormData = {
    cargofile: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Admin", href: adminCargo.url() },
    { title: "Cargo", href: adminCargo.url() },
];

const tabs: Tab[] = [
    { id: "overview", label: "Overview" },
    { id: "edit", label: "Edit" },
    { id: "variables", label: "Variables" },
    { id: "install", label: "Install" },
    { id: "danger", label: "Danger" },
];

function sourceLabel(sourceType: AdminCargo["source_type"]): string {
    return sourceType === "pterodactyl" ? "Pterodactyl egg" : "Skyport Cargo";
}

function stringifyCargofile(definition: CargoDefinition): string {
    return JSON.stringify(definition, null, 4);
}

function StackedStatCard({
    label,
    value,
    description,
}: {
    label: string;
    value: string;
    description?: string;
}) {
    return (
        <div className="overflow-hidden rounded-lg bg-muted/40">
            <div className="px-4 py-2.5">
                <span className="text-xs font-medium text-muted-foreground">
                    {label}
                </span>
            </div>
            <div className="rounded-lg border border-border/70 bg-background p-5">
                <p className="text-3xl font-semibold text-foreground">
                    {value}
                </p>
                {description ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {description}
                    </p>
                ) : null}
            </div>
        </div>
    );
}

function JsonEditor({
    id,
    value,
    onChange,
    placeholder,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <textarea
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="min-h-80 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            spellCheck={false}
        />
    );
}

function CreateCargoModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const form = useForm<CreateCargoFormData>({
        name: "",
        author: "",
        description: "",
        startup: "./start.sh",
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
                const remaining =
                    minimumMs - (Date.now() - submitStart.current);
                setTimeout(() => setSubmitting(false), Math.max(0, remaining));
            },
            onSuccess: () => {
                toast.success("Cargo created");
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
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create cargo</DialogTitle>
                    <DialogDescription>
                        Start a new reusable server recipe with a clean
                        .cargofile scaffold.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="cargo-name">Name</Label>
                        <Input
                            id="cargo-name"
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData("name", event.target.value)
                            }
                            placeholder="Paper"
                            required
                        />
                        <InputError message={form.errors.name} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="cargo-author">Author</Label>
                        <Input
                            id="cargo-author"
                            value={form.data.author}
                            onChange={(event) =>
                                form.setData("author", event.target.value)
                            }
                            placeholder="hello@skyport.sh"
                            required
                        />
                        <InputError message={form.errors.author} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="cargo-description">Description</Label>
                        <textarea
                            id="cargo-description"
                            value={form.data.description}
                            onChange={(event) =>
                                form.setData("description", event.target.value)
                            }
                            placeholder="Describe what this cargo runs and how operators should use it."
                            className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                        />
                        <InputError message={form.errors.description} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="cargo-startup">Startup command</Label>
                        <Input
                            id="cargo-startup"
                            value={form.data.startup}
                            onChange={(event) =>
                                form.setData("startup", event.target.value)
                            }
                            placeholder="./start.sh"
                            required
                        />
                        <InputError message={form.errors.startup} />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={submitting || form.processing}
                        >
                            {(submitting || form.processing) && <Spinner />}
                            Create cargo
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ImportCargoModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const form = useForm<ImportCargoFormData>({
        content: "",
    });
    const minimumMs = 500;
    const submitStart = useRef(0);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedFileName, setSelectedFileName] = useState("");

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];

        if (!file) {
            setSelectedFileName("");
            form.setData("content", "");
            return;
        }

        setSelectedFileName(file.name);
        form.clearErrors("content");
        form.setData("content", await file.text());
    };

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!form.data.content) {
            form.setError("content", "Please choose a cargo file to import.");
            return;
        }

        form.post(importCargo.url(), {
            preserveScroll: true,
            onStart: () => {
                submitStart.current = Date.now();
                setSubmitting(true);
            },
            onFinish: () => {
                const remaining =
                    minimumMs - (Date.now() - submitStart.current);
                setTimeout(() => setSubmitting(false), Math.max(0, remaining));
            },
            onSuccess: () => {
                toast.success("Cargo imported");
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
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Import cargo</DialogTitle>
                    <DialogDescription>
                        Select a Skyport .cargofile or a Pterodactyl egg export.
                        Skyport will auto-detect the format and normalize it.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">
                            Supported formats
                        </p>
                        <p className="mt-1">
                            • Skyport .cargofile JSON ({"{"} meta.version:
                            &nbsp;SPDL_v1 {"}"})
                        </p>
                        <p>
                            • Pterodactyl egg JSON ({"{"} meta.version:
                            &nbsp;PTDL_v1/PTDL_v2 {"}"})
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="cargo-import-file">Cargo file</Label>
                        <input
                            ref={fileInputRef}
                            id="cargo-import-file"
                            type="file"
                            accept=".cargofile,.json,application/json"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <div className="rounded-lg border border-dashed border-border/70 bg-background p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground">
                                        {selectedFileName || "No file selected"}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Choose a .cargofile or egg export from
                                        your computer.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="cursor-pointer"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                >
                                    <Upload className="h-4 w-4" />
                                    Select file
                                </Button>
                            </div>
                        </div>
                        <InputError message={form.errors.content} />
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={submitting || form.processing}
                        >
                            {(submitting || form.processing) && <Spinner />}
                            Import cargo
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function CargoModal({
    cargo,
    open,
    onClose,
    onDelete,
}: {
    cargo: AdminCargo;
    open: boolean;
    onClose: () => void;
    onDelete: (cargo: AdminCargo) => void;
}) {
    const [tab, setTab] = useState("overview");
    const form = useForm<EditCargoFormData>({
        cargofile: cargo.cargofile || stringifyCargofile(cargo.definition),
    });
    const minimumMs = 500;
    const submitStart = useRef(0);
    const [submitting, setSubmitting] = useState(false);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.patch(update.url(cargo.id), {
            preserveScroll: true,
            onStart: () => {
                submitStart.current = Date.now();
                setSubmitting(true);
            },
            onFinish: () => {
                const remaining =
                    minimumMs - (Date.now() - submitStart.current);
                setTimeout(() => setSubmitting(false), Math.max(0, remaining));
            },
            onSuccess: () => {
                toast.success("Cargo updated");
            },
            onError: (errors) => {
                Object.values(errors).forEach((message) => {
                    toast.error(message);
                });
            },
        });
    };

    const exportCargofile = () => {
        const blob = new Blob([form.data.cargofile], {
            type: "application/json;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `${cargo.slug || cargo.name}.cargofile`;
        link.click();

        URL.revokeObjectURL(url);
        toast.success("Cargo exported");
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContentFull>
                <div className="px-8 pt-8 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/60">
                            <CargoIcon className="size-6 text-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-lg">
                                {cargo.name}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                View and manage details for {cargo.name}.
                            </DialogDescription>
                            <p className="text-sm text-muted-foreground">
                                {cargo.author}
                            </p>
                        </div>
                    </div>

                    <div className="mt-6">
                        <SlidingTabs
                            tabs={tabs}
                            active={tab}
                            onChange={setTab}
                        />
                    </div>
                </div>

                <div className="border-t border-border/60" />

                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {tab === "overview" ? (
                        <div className="flex gap-6">
                            <div className="min-w-0 flex-1 space-y-1">
                                {[
                                    {
                                        label: "Cargo ID",
                                        value: `#${cargo.id}`,
                                    },
                                    { label: "Name", value: cargo.name },
                                    { label: "Slug", value: cargo.slug },
                                    {
                                        label: "Source",
                                        value: sourceLabel(cargo.source_type),
                                    },
                                    { label: "Author", value: cargo.author },
                                    {
                                        label: "Startup",
                                        value: cargo.definition.startup,
                                    },
                                    {
                                        label: "Created",
                                        value: formatDate(
                                            cargo.created_at,
                                            true,
                                        ),
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

                                <div className="rounded-lg border border-border/70 bg-background p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">
                                                Description
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {cargo.description ||
                                                    "No description provided."}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 cursor-pointer"
                                            onClick={exportCargofile}
                                        >
                                            <Download className="mr-1.5 h-3.5 w-3.5" />
                                            Export .cargofile
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="w-[320px] shrink-0 space-y-3">
                                <StackedStatCard
                                    label="Variables"
                                    value={String(cargo.variables_count)}
                                    description={
                                        cargo.variables_count === 1
                                            ? "Environment variable"
                                            : "Environment variables"
                                    }
                                />
                                <StackedStatCard
                                    label="Docker images"
                                    value={String(cargo.docker_images_count)}
                                    description="Selectable runtime images"
                                />
                                <StackedStatCard
                                    label="Format"
                                    value={cargo.definition.meta.version}
                                    description={sourceLabel(cargo.source_type)}
                                />
                            </div>
                        </div>
                    ) : null}

                    {tab === "edit" ? (
                        <div className="max-w-5xl">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Edit .cargofile
                                    </h3>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Cargo uses editable JSON with a Skyport
                                        meta.version of SPDL_v1. You can paste a
                                        Pterodactyl egg into Import to normalize
                                        it first.
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 cursor-pointer"
                                    onClick={exportCargofile}
                                >
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                    Export
                                </Button>
                            </div>

                            <form onSubmit={submit} className="mt-6 space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="cargo-cargofile">
                                        .cargofile
                                    </Label>
                                    <JsonEditor
                                        id="cargo-cargofile"
                                        value={form.data.cargofile}
                                        onChange={(value) =>
                                            form.setData("cargofile", value)
                                        }
                                    />
                                    <InputError
                                        message={form.errors.cargofile}
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={submitting || form.processing}
                                    >
                                        {(submitting || form.processing) && (
                                            <Spinner />
                                        )}
                                        Save changes
                                    </Button>
                                </div>
                            </form>
                        </div>
                    ) : null}

                    {tab === "variables" ? (
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-foreground">
                                    Variables
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Review environment variables exposed by this
                                    cargo.
                                </p>
                            </div>

                            {cargo.definition.variables.length > 0 ? (
                                <div className="overflow-hidden rounded-lg bg-muted/40">
                                    <div className="rounded-lg border border-border/70 bg-background p-1">
                                        <div className="grid grid-cols-[1.1fr_0.9fr_0.9fr_120px] gap-4 border-b border-border/60 px-4 py-2 text-xs font-medium text-muted-foreground">
                                            <span>Variable</span>
                                            <span>Environment</span>
                                            <span>Default</span>
                                            <span>Flags</span>
                                        </div>
                                        <div className="divide-y divide-border/60">
                                            {cargo.definition.variables.map(
                                                (variable) => (
                                                    <div
                                                        key={
                                                            variable.env_variable
                                                        }
                                                        className="grid grid-cols-[1.1fr_0.9fr_0.9fr_120px] gap-4 px-4 py-3"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-foreground">
                                                                {variable.name}
                                                            </p>
                                                            <p className="mt-1 text-xs text-muted-foreground">
                                                                {variable.description ||
                                                                    "No description provided."}
                                                            </p>
                                                        </div>
                                                        <p className="truncate font-mono text-xs text-foreground">
                                                            {
                                                                variable.env_variable
                                                            }
                                                        </p>
                                                        <p className="truncate text-xs text-muted-foreground">
                                                            {variable.default_value ||
                                                                "—"}
                                                        </p>
                                                        <div className="space-y-1 text-xs text-muted-foreground">
                                                            <p>
                                                                {variable.user_viewable
                                                                    ? "Visible"
                                                                    : "Hidden"}
                                                            </p>
                                                            <p>
                                                                {variable.user_editable
                                                                    ? "Editable"
                                                                    : "Locked"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-lg border border-border/70 bg-background px-4 py-10 text-center">
                                    <p className="text-sm font-medium text-foreground">
                                        No variables defined
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Add variables in the .cargofile edit tab
                                        to expose configuration to users.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : null}

                    {tab === "install" ? (
                        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                            <div className="space-y-3">
                                <StackedStatCard
                                    label="Container"
                                    value={
                                        cargo.definition.scripts.installation
                                            .container || "—"
                                    }
                                    description="Installer image"
                                />
                                <StackedStatCard
                                    label="Entrypoint"
                                    value={
                                        cargo.definition.scripts.installation
                                            .entrypoint || "—"
                                    }
                                    description="Installer entrypoint"
                                />
                                <StackedStatCard
                                    label="Stop command"
                                    value={cargo.definition.config.stop || "—"}
                                    description="Panel stop instruction"
                                />
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Installation script
                                    </h3>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        This script prepares server files inside
                                        the installer container.
                                    </p>
                                </div>
                                <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
                                    <pre className="max-h-105 overflow-auto px-4 py-4 font-mono text-xs text-foreground whitespace-pre-wrap">
                                        {cargo.definition.scripts.installation
                                            .script ||
                                            "# No installation script provided"}
                                    </pre>
                                </div>
                            </div>
                        </div>
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
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">
                                                Delete cargo
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Permanently remove this cargo
                                                definition from the panel.
                                            </p>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            className="cursor-pointer"
                                            onClick={() => onDelete(cargo)}
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
        </Dialog>
    );
}

export default function Cargo({ cargo, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const viewingCargoDialog = useDialogState<AdminCargo>();
    const creatingCargoDialog = useDialogState<boolean>();
    const importingCargoDialog = useDialogState<boolean>();
    const [deletingCargo, setDeletingCargo] = useState<AdminCargo | null>(null);
    const [singleDeleting, setSingleDeleting] = useState(false);

    const navigate = (params: Record<string, string | undefined>) => {
        router.get(adminCargo.url(), params as Record<string, string>, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        navigate({ search: value || undefined });
    };

    const cargoMap = useMemo(
        () => new Map(cargo.data.map((item) => [item.id, item])),
        [cargo.data],
    );

    const columns: Column<AdminCargo>[] = [
        {
            label: "Cargo",
            width: "w-[40%]",
            render: (item) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                        <CargoIcon className="size-5 text-foreground" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                            {item.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {item.author}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            label: "Source",
            width: "w-[18%]",
            render: (item) => (
                <span
                    className={cn(
                        "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                        item.source_type === "pterodactyl"
                            ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                            : "bg-[#d92400]/12 text-[#d92400] dark:text-[#ff8a6b]",
                    )}
                >
                    {sourceLabel(item.source_type)}
                </span>
            ),
        },
        {
            label: "Contents",
            width: "w-[18%]",
            render: (item) => (
                <div className="text-xs text-muted-foreground">
                    <p>{item.variables_count} vars</p>
                    <p>{item.docker_images_count} images</p>
                </div>
            ),
        },
    ];

    const rowMenu = (item: AdminCargo) => (
        <DropdownMenu modal={false}>
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
                    onSelect={() => setDeletingCargo(item)}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin — Cargo" />

            <AdminLayout
                title="Cargo"
                description="Server recipes that contain Docker images, variables, and so on."
            >
                <DataTable
                    data={cargo}
                    columns={columns}
                    searchValue={search}
                    onSearch={handleSearch}
                    onRowClick={(item) =>
                        viewingCargoDialog.show(cargoMap.get(item.id) ?? item)
                    }
                    rowMenu={rowMenu}
                    bulkDeleteUrl={bulkDestroy.url()}
                    entityName="cargo"
                    emptyMessage="No cargo found"
                    actions={
                        <>
                            <Button
                                size="table"
                                variant="outline"
                                onClick={() => importingCargoDialog.show(true)}
                            >
                                <FileUp className="h-3.5 w-3.5" />
                                Import
                            </Button>
                            <Button
                                size="table"
                                onClick={() => creatingCargoDialog.show(true)}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Create new
                            </Button>
                        </>
                    }
                />
            </AdminLayout>

            {creatingCargoDialog.payload ? (
                <CreateCargoModal
                    open={creatingCargoDialog.open}
                    onClose={creatingCargoDialog.hide}
                />
            ) : null}

            {importingCargoDialog.payload ? (
                <ImportCargoModal
                    open={importingCargoDialog.open}
                    onClose={importingCargoDialog.hide}
                />
            ) : null}

            {viewingCargoDialog.payload ? (
                <CargoModal
                    cargo={viewingCargoDialog.payload}
                    open={viewingCargoDialog.open}
                    onClose={viewingCargoDialog.hide}
                    onDelete={setDeletingCargo}
                />
            ) : null}

            <ConfirmDeleteDialog
                open={deletingCargo !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingCargo(null);
                    }
                }}
                title={`Delete ${deletingCargo?.name ?? "cargo"}?`}
                description="This action cannot be undone. The selected cargo will be permanently removed."
                loading={singleDeleting}
                onConfirm={() => {
                    if (!deletingCargo) {
                        return;
                    }

                    setSingleDeleting(true);
                    router.delete(destroy.url(deletingCargo.id), {
                        onSuccess: () => {
                            toast.success(`${deletingCargo.name} deleted`);
                            if (
                                viewingCargoDialog.payload?.id ===
                                deletingCargo.id
                            ) {
                                viewingCargoDialog.hide();
                            }
                            setDeletingCargo(null);
                        },
                        onFinish: () => setSingleDeleting(false),
                    });
                }}
            />
        </AppLayout>
    );
}
