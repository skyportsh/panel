import { Head, router, useForm } from "@inertiajs/react";
import { Ellipsis, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
    bulkDestroy,
    destroy,
    index as adminLocations,
    store,
    update,
} from "@/actions/App/Http/Controllers/Admin/LocationsController";
import { ConfirmDeleteDialog, DataTable } from "@/components/admin/data-table";
import type { Column, PaginatedData } from "@/components/admin/data-table";
import { CountryFlagIcon, CountryFlagOption } from "@/components/country-flag";
import InputError from "@/components/input-error";
import { toast } from "@/components/ui/sonner";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { SlidingTabs } from "@/components/ui/sliding-tabs";
import type { Tab } from "@/components/ui/sliding-tabs";
import { Spinner } from "@/components/ui/spinner";
import { countryFlags } from "@/data/country-flags";
import { useDialogState } from "@/hooks/use-dialog-state";
import AdminLayout from "@/layouts/admin/layout";
import AppLayout from "@/layouts/app-layout";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/types";

type AdminLocation = {
    id: number;
    name: string;
    country: string;
    nodes_count: number;
    created_at: string;
    updated_at: string;
};

type Props = {
    locations: PaginatedData<AdminLocation>;
    filters: { search: string };
};

type LocationFormData = {
    name: string;
    country: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: "Admin", href: adminLocations.url() },
    { title: "Locations", href: adminLocations.url() },
];

const countryOptions = countryFlags
    .map((country) => country.name)
    .toSorted((left, right) => left.localeCompare(right));

const tabs: Tab[] = [
    { id: "overview", label: "Overview" },
    { id: "edit", label: "Edit" },
    { id: "danger", label: "Danger" },
];

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

function CountrySelect({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-full">
                <span
                    className={cn(
                        "truncate",
                        !value && "text-muted-foreground",
                    )}
                >
                    {value || "Choose a country"}
                </span>
            </SelectTrigger>
            <SelectContent>
                {countryOptions.map((country) => (
                    <SelectItem key={country} value={country}>
                        <CountryFlagOption countryName={country} />
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function LocationFormFields({
    data,
    setData,
    errors,
}: {
    data: LocationFormData;
    setData: <K extends keyof LocationFormData>(
        key: K,
        value: LocationFormData[K],
    ) => void;
    errors: Partial<Record<keyof LocationFormData, string>>;
}) {
    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="location-name">Name</Label>
                <Input
                    id="location-name"
                    value={data.name}
                    onChange={(event) => setData("name", event.target.value)}
                    placeholder="Frankfurt"
                    required
                />
                <InputError message={errors.name} />
            </div>

            <div className="grid gap-2">
                <Label>Country</Label>
                <CountrySelect
                    value={data.country}
                    onChange={(value) => setData("country", value)}
                />
                <InputError message={errors.country} />
            </div>
        </div>
    );
}

function CreateLocationModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const form = useForm<LocationFormData>({
        name: "",
        country: "",
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
                toast.success("Location created");
                onClose();
            },
            onError: (errors) => {
                Object.values(errors).forEach((message) =>
                    toast.error(message),
                );
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create location</DialogTitle>
                    <DialogDescription className="sr-only">
                        Create a new location with a name and country.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-4">
                    <LocationFormFields
                        data={form.data}
                        setData={form.setData}
                        errors={form.errors}
                    />

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={submitting || form.processing}
                        >
                            {(submitting || form.processing) && <Spinner />}
                            Create location
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function LocationModal({
    location,
    open,
    onClose,
    onDelete,
}: {
    location: AdminLocation;
    open: boolean;
    onClose: () => void;
    onDelete: (location: AdminLocation) => void;
}) {
    const [tab, setTab] = useState("overview");
    const form = useForm<LocationFormData>({
        name: location.name,
        country: location.country,
    });
    const minimumMs = 500;
    const submitStart = useRef(0);
    const [submitting, setSubmitting] = useState(false);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.patch(update.url(location.id), {
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
                toast.success("Location updated");
            },
            onError: (errors) => {
                Object.values(errors).forEach((message) =>
                    toast.error(message),
                );
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
            <DialogContentFull>
                <div className="px-8 pt-8 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/60">
                            <CountryFlagIcon
                                countryName={location.country}
                                className="[&_svg]:size-6"
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-lg">
                                {location.name}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                View and manage details for {location.name}.
                            </DialogDescription>
                            <p className="text-sm text-muted-foreground">
                                {location.country}
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
                                        label: "Location ID",
                                        value: `#${location.id}`,
                                    },
                                    { label: "Name", value: location.name },
                                    {
                                        label: "Country",
                                        value: location.country,
                                    },
                                    {
                                        label: "Created",
                                        value: formatDate(
                                            location.created_at,
                                            true,
                                        ),
                                    },
                                    {
                                        label: "Last updated",
                                        value: formatDate(
                                            location.updated_at,
                                            true,
                                        ),
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.label}
                                        className="flex items-center justify-between rounded-md px-3 py-2.5"
                                    >
                                        <span className="text-sm text-muted-foreground">
                                            {item.label}
                                        </span>
                                        <span className="text-sm font-medium text-foreground">
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="w-75 shrink-0 space-y-3">
                                <StackedStatCard
                                    label="Nodes"
                                    value={String(location.nodes_count)}
                                    description={
                                        location.nodes_count === 1
                                            ? "Attached node"
                                            : "Attached nodes"
                                    }
                                />
                                <StackedStatCard
                                    label="Region"
                                    value={location.country}
                                    description="Used for admin organization and node grouping."
                                />
                            </div>
                        </div>
                    ) : null}

                    {tab === "edit" ? (
                        <div className="max-w-xl">
                            <h3 className="text-sm font-semibold text-foreground">
                                Details
                            </h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Update this location's name and regional
                                metadata.
                            </p>

                            <form onSubmit={submit} className="mt-6 space-y-4">
                                <LocationFormFields
                                    data={form.data}
                                    setData={form.setData}
                                    errors={form.errors}
                                />

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
                                                Delete location
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Permanently remove this location
                                                and any nodes assigned to it.
                                            </p>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            className="cursor-pointer"
                                            onClick={() => onDelete(location)}
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

export default function Locations({ locations, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const viewingLocationDialog = useDialogState<AdminLocation>();
    const creatingLocationDialog = useDialogState<boolean>();
    const [deletingLocation, setDeletingLocation] =
        useState<AdminLocation | null>(null);
    const [singleDeleting, setSingleDeleting] = useState(false);

    const navigate = (params: Record<string, string | undefined>) => {
        router.get(adminLocations.url(), params as Record<string, string>, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        navigate({ search: value || undefined });
    };

    const locationMap = useMemo(
        () =>
            new Map(locations.data.map((location) => [location.id, location])),
        [locations.data],
    );

    const columns: Column<AdminLocation>[] = [
        {
            label: "Location",
            width: "w-[42%]",
            render: (location) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                        <CountryFlagIcon countryName={location.country} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                            {location.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {location.country}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            label: "Nodes",
            width: "w-[18%]",
            render: (location) => (
                <div className="text-sm font-medium text-foreground">
                    {location.nodes_count}
                </div>
            ),
        },
        {
            label: "Last updated",
            width: "flex-1",
            render: (location) => (
                <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(location.updated_at)}
                </span>
            ),
        },
    ];

    const rowMenu = (location: AdminLocation) => (
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
                    onSelect={() => setDeletingLocation(location)}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin — Locations" />

            <AdminLayout
                title="Locations"
                description="Organize nodes into clean regional groupings."
            >
                <DataTable
                    data={locations}
                    columns={columns}
                    searchValue={search}
                    onSearch={handleSearch}
                    onRowClick={(location) =>
                        viewingLocationDialog.show(
                            locationMap.get(location.id) ?? location,
                        )
                    }
                    rowMenu={rowMenu}
                    bulkDeleteUrl={bulkDestroy.url()}
                    entityName="location"
                    emptyMessage="No locations found"
                    actions={
                        <Button
                            size="table"
                            onClick={() => creatingLocationDialog.show(true)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Create new
                        </Button>
                    }
                />
            </AdminLayout>

            {creatingLocationDialog.payload ? (
                <CreateLocationModal
                    open={creatingLocationDialog.open}
                    onClose={creatingLocationDialog.hide}
                />
            ) : null}

            {viewingLocationDialog.payload ? (
                <LocationModal
                    location={viewingLocationDialog.payload}
                    open={viewingLocationDialog.open}
                    onClose={viewingLocationDialog.hide}
                    onDelete={setDeletingLocation}
                />
            ) : null}

            <ConfirmDeleteDialog
                open={deletingLocation !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingLocation(null);
                    }
                }}
                title={`Delete ${deletingLocation?.name ?? "location"}?`}
                description="This action cannot be undone. The selected location will be permanently removed."
                loading={singleDeleting}
                onConfirm={() => {
                    if (!deletingLocation) {
                        return;
                    }

                    setSingleDeleting(true);
                    router.delete(destroy.url(deletingLocation.id), {
                        onSuccess: () => {
                            toast.success(`${deletingLocation.name} deleted`);
                            if (
                                viewingLocationDialog.payload?.id ===
                                deletingLocation.id
                            ) {
                                viewingLocationDialog.hide();
                            }
                            setDeletingLocation(null);
                        },
                        onFinish: () => setSingleDeleting(false),
                    });
                }}
            />
        </AppLayout>
    );
}
