import { Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/components/ui/sonner';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PaginationLink = {
    active: boolean;
    label: string;
    url: string | null;
};

export type PaginatedData<T> = {
    data: T[];
    links: PaginationLink[];
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
};

export type Column<T> = {
    label: string;
    width: string;
    render: (item: T) => ReactNode;
};

type DataTableProps<T extends { id: number }> = {
    data: PaginatedData<T>;
    columns: Column<T>[];
    searchValue: string;
    onSearch: (value: string) => void;
    onRowClick?: (item: T) => void;
    rowMenu?: (item: T) => ReactNode;
    actions?: ReactNode;
    bulkDeleteUrl?: string;
    emptyMessage?: string;
    emptySearchMessage?: string;
    entityName?: string;
    selectable?: boolean;
};

// ─── Pagination ──────────────────────────────────────────────────────────────

function DataTablePagination({ data }: { data: PaginatedData<unknown> }) {
    if (data.last_page <= 1) {
        return null;
    }

    return (
        <nav
            className="flex items-center justify-center gap-0.5"
            aria-label="Pagination"
        >
            <Link
                href={data.links[0]?.url ?? '#'}
                preserveScroll
                className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all duration-150 ease-out active:scale-95 active:duration-0',
                    data.links[0]?.url
                        ? 'hover:bg-muted hover:text-foreground'
                        : 'pointer-events-none opacity-30',
                )}
            >
                <ChevronLeft className="h-3.5 w-3.5" />
            </Link>

            {data.links.slice(1, -1).map((link, index) => {
                const page = index + 1;
                const current = data.current_page;
                const last = data.last_page;

                const isVisible =
                    page === 1 ||
                    page === last ||
                    Math.abs(page - current) <= 1;
                const isEllipsis =
                    !isVisible && (page === 2 || page === last - 1);

                if (!isVisible && !isEllipsis) {
                    return null;
                }

                if (isEllipsis) {
                    return (
                        <span
                            key={`ellipsis-${index}`}
                            className="flex h-7 w-7 items-center justify-center text-[11px] text-muted-foreground"
                        >
                            …
                        </span>
                    );
                }

                return (
                    <Link
                        key={`page-${page}`}
                        href={link.url ?? '#'}
                        preserveScroll
                        className={cn(
                            'flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-medium transition-all duration-150 ease-out active:scale-95 active:duration-0',
                            link.active
                                ? 'bg-muted text-foreground'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                        )}
                    >
                        {page}
                    </Link>
                );
            })}

            <Link
                href={data.links[data.links.length - 1]?.url ?? '#'}
                preserveScroll
                className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-all duration-150 ease-out active:scale-95 active:duration-0',
                    data.links[data.links.length - 1]?.url
                        ? 'hover:bg-muted hover:text-foreground'
                        : 'pointer-events-none opacity-30',
                )}
            >
                <ChevronRight className="h-3.5 w-3.5" />
            </Link>
        </nav>
    );
}

// ─── Bulk action bar ─────────────────────────────────────────────────────────

function BulkActionBar({
    count,
    entityName = 'item',
    onDelete,
    onCancel,
}: {
    count: number;
    entityName?: string;
    onDelete: () => void;
    onCancel: () => void;
}) {
    const plural = count === 1 ? entityName : `${entityName}s`;

    return (
        <>
            {/* Backdrop blur */}
            <div
                aria-hidden="true"
                className={cn(
                    'pointer-events-none fixed inset-x-0 -bottom-4 z-40 h-52 transition-all duration-300 ease-out',
                    count > 0
                        ? 'translate-y-0 opacity-100'
                        : 'translate-y-full opacity-0',
                )}
            >
                <div className="absolute inset-x-0 bottom-0 h-1/4 backdrop-blur-md" />
                <div className="absolute inset-x-0 bottom-0 h-2/4 backdrop-blur-sm" />
                <div className="absolute inset-x-0 bottom-0 h-3/4 backdrop-blur-[2px]" />
                <div className="absolute inset-x-0 bottom-0 h-full backdrop-blur-[1px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>

            {/* Action bar */}
            <div
                className={cn(
                    'fixed inset-x-0 bottom-0 z-50 flex justify-center transition-all duration-300 ease-out',
                    count > 0
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none translate-y-full opacity-0',
                )}
            >
                <div className="mb-6 flex items-center gap-3 rounded-xl border border-border/70 bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur">
                    <span className="text-xs font-medium text-muted-foreground">
                        {count} {plural} selected
                    </span>
                    <div className="h-4 w-px bg-border" />
                    <Button
                        size="table"
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={onDelete}
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                    </Button>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cursor-pointer text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Confirm delete dialog ───────────────────────────────────────────────────

export function ConfirmDeleteDialog({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    loading,
    confirmLabel = 'Delete',
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    onConfirm: () => void;
    loading: boolean;
    confirmLabel?: string;
}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        disabled={loading}
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                    >
                        {loading && <Spinner />}
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// ─── Data table row ──────────────────────────────────────────────────────────

function DataTableRow<T extends { id: number }>({
    item,
    columns,
    isSelected,
    onToggle,
    onClick,
    menu,
    selectable,
}: {
    item: T;
    columns: Column<T>[];
    isSelected: boolean;
    onToggle: () => void;
    onClick?: () => void;
    menu?: ReactNode;
    selectable: boolean;
}) {
    return (
        <div
            className={cn(
                'group relative overflow-hidden rounded-md transition-colors duration-150 ease-out',
                isSelected
                    ? 'bg-[#d92400]/10 dark:bg-[#d92400]/20'
                    : 'hover:bg-muted/40',
            )}
        >
            <PlaceholderPattern
                patternSize={6}
                className={cn(
                    'absolute inset-0 size-full transition-opacity',
                    isSelected
                        ? 'stroke-[#d92400]/15 opacity-100 dark:stroke-[#d92400]/25'
                        : 'stroke-neutral-900/10 opacity-0 group-hover:opacity-100 dark:stroke-neutral-100/10',
                )}
            />
            <div
                className={cn(
                    'relative flex items-center px-3 py-2.5',
                    onClick && 'cursor-pointer',
                )}
                onClick={onClick}
            >
                {selectable ? (
                    <div
                        className="mr-3 flex items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Checkbox
                            checked={isSelected}
                            onCheckedChange={onToggle}
                            aria-label="Select row"
                        />
                    </div>
                ) : null}

                {columns.map((col, i) => (
                    <div key={i} className={col.width}>
                        {col.render(item)}
                    </div>
                ))}

                {menu && (
                    <div
                        className="ml-auto flex items-center"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {menu}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Main data table ─────────────────────────────────────────────────────────

export function DataTable<T extends { id: number }>({
    data,
    columns,
    searchValue,
    onSearch,
    onRowClick,
    rowMenu,
    actions,
    bulkDeleteUrl,
    emptyMessage = 'No items found',
    emptySearchMessage = 'Try a different search term.',
    entityName = 'item',
    selectable = true,
}: DataTableProps<T>) {
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
    const [bulkDeleting, setBulkDeleting] = useState(false);

    const allSelected =
        data.data.length > 0 && selected.size === data.data.length;
    const someSelected = selected.size > 0 && !allSelected;

    const toggleAll = () => {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(data.data.map((item) => item.id)));
        }
    };

    const toggleOne = (id: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Clear selection on data change
    useEffect(() => {
        setSelected(new Set());
    }, [data.current_page, data.data]);

    // Smooth height animation
    const tableBodyRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const outer = tableBodyRef.current;
        const inner = innerRef.current;
        if (!outer || !inner) {
            return;
        }

        const newHeight = inner.scrollHeight;
        const oldHeight = outer.offsetHeight;

        if (!oldHeight || Math.abs(newHeight - oldHeight) < 1) {
            outer.style.height = `${newHeight}px`;
            return;
        }

        outer.style.transition = 'none';
        outer.style.height = `${oldHeight}px`;
        void outer.offsetHeight;
        outer.style.transition = 'height 300ms ease-in-out';
        outer.style.height = `${newHeight}px`;
    });

    return (
        <>
            <div className="space-y-4">
                <div className="overflow-hidden rounded-lg bg-muted/40">
                    {/* Header */}
                    <div className="relative flex items-center px-4 py-2.5">
                        {selectable ? (
                            <div className="mr-3 flex items-center">
                                <Checkbox
                                    checked={
                                        allSelected
                                            ? true
                                            : someSelected
                                              ? 'indeterminate'
                                              : false
                                    }
                                    onCheckedChange={toggleAll}
                                    aria-label="Select all"
                                />
                            </div>
                        ) : null}
                        {columns.map((col, i) => (
                            <span
                                key={i}
                                className={cn(
                                    'block text-xs font-medium text-muted-foreground',
                                    col.width,
                                )}
                            >
                                {col.label}
                            </span>
                        ))}
                        <div className="w-7 shrink-0" />

                        <div className="absolute top-1/2 right-4 flex -translate-y-1/2 items-center gap-2">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    variant="table"
                                    value={searchValue}
                                    onChange={(e) => onSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="w-44 pl-7"
                                />
                            </div>
                            {actions}
                        </div>
                    </div>

                    {/* Body */}
                    <div
                        ref={tableBodyRef}
                        className="overflow-hidden rounded-lg border border-border/70 bg-background"
                    >
                        <div ref={innerRef} className="flex flex-col gap-1 p-1">
                            {data.data.length > 0 ? (
                                data.data.map((item) => (
                                    <DataTableRow
                                        key={item.id}
                                        item={item}
                                        columns={columns}
                                        isSelected={selected.has(item.id)}
                                        onToggle={() => toggleOne(item.id)}
                                        onClick={
                                            onRowClick
                                                ? () => onRowClick(item)
                                                : undefined
                                        }
                                        menu={rowMenu?.(item)}
                                        selectable={selectable}
                                    />
                                ))
                            ) : (
                                <div className="px-4 py-12 text-center">
                                    <p className="text-sm font-medium text-foreground">
                                        {emptyMessage}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {searchValue
                                            ? emptySearchMessage
                                            : `${entityName.charAt(0).toUpperCase() + entityName.slice(1)}s will appear here.`}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DataTablePagination data={data} />
            </div>

            {bulkDeleteUrl && (
                <>
                    <BulkActionBar
                        count={selected.size}
                        entityName={entityName}
                        onDelete={() => setConfirmBulkDelete(true)}
                        onCancel={() => setSelected(new Set())}
                    />

                    <ConfirmDeleteDialog
                        open={confirmBulkDelete}
                        onOpenChange={setConfirmBulkDelete}
                        title={`Delete ${selected.size} ${selected.size === 1 ? entityName : `${entityName}s`}?`}
                        description="This action cannot be undone. The selected items will be permanently removed."
                        loading={bulkDeleting}
                        onConfirm={() => {
                            setBulkDeleting(true);
                            router.delete(bulkDeleteUrl, {
                                data: { ids: Array.from(selected) },
                                onSuccess: () => {
                                    toast.success(
                                        `${selected.size} ${selected.size === 1 ? entityName : `${entityName}s`} deleted`,
                                    );
                                    setSelected(new Set());
                                    setConfirmBulkDelete(false);
                                },
                                onFinish: () => setBulkDeleting(false),
                            });
                        }}
                    />
                </>
            )}
        </>
    );
}
