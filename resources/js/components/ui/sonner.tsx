import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { cn } from '@/lib/utils';

type ToastVariant = 'default' | 'success' | 'error';

type ToastItem = {
    id: string;
    message: string;
    variant: ToastVariant;
    removing?: boolean;
    visible?: boolean;
};

let globalAddToast: ((message: string, variant: ToastVariant) => void) | null = null;

const colors: Record<ToastVariant, { bg: string; text: string }> = {
    default: {
        bg: 'bg-neutral-900 dark:bg-neutral-800',
        text: 'text-neutral-100',
    },
    success: {
        bg: 'bg-emerald-950',
        text: 'text-emerald-100',
    },
    error: {
        bg: 'bg-red-950',
        text: 'text-red-100',
    },
};

function Toast({
    item,
    onRemove,
}: {
    item: ToastItem;
    onRemove: (id: string) => void;
}) {
    const color = colors[item.variant];
    const toastShape =
        'path("M 10 0 H 346 Q 356 0 356 10 V 38 L 338 56 H 18 L 0 38 V 10 Q 0 0 10 0 Z")';
    const borderPath =
        'M 10 0 H 346 Q 356 0 356 10 V 38 L 338 56 H 18 L 0 38 V 10 Q 0 0 10 0 Z';

    useEffect(() => {
        const timer = setTimeout(() => onRemove(item.id), 4000);

        return () => {
            clearTimeout(timer);
        };
    }, [item.id, onRemove]);

    return (
        <div
            className={cn(
                'relative w-[356px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform',
                item.removing
                    ? '-translate-y-2 scale-[0.96] opacity-0 blur-[1px]'
                    : item.visible
                      ? 'translate-y-0 scale-100 opacity-100 blur-0'
                      : '-translate-y-3 scale-[0.97] opacity-0 blur-[2px]',
            )}
        >
            <div className="relative min-h-14" style={{ clipPath: toastShape }}>
                <div className={cn('pointer-events-none absolute inset-0', color.bg)} />
                <PlaceholderPattern className="pointer-events-none absolute inset-0 opacity-[0.13] [&_path]:stroke-white/75" patternSize={7} />

                <div className={cn('relative z-10 flex min-h-14 items-center justify-between gap-3 px-4 py-3 pr-5', color.text)}>
                    <p className="pl-1 text-sm font-medium">{item.message}</p>

                    <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="relative z-20 shrink-0 cursor-pointer rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100"
                    >
                        <X className="size-3.5" />
                    </button>
                </div>
            </div>

            <svg
                viewBox="0 0 356 56"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-14 w-full"
                fill="none"
                aria-hidden="true"
            >
                <path d={borderPath} className="stroke-white/12" strokeWidth="1" />
            </svg>
        </div>
    );
}

function Toaster({ children }: { children?: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const idCounter = useRef(0);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) =>
            prev.map((toast) =>
                toast.id === id ? { ...toast, removing: true, visible: false } : toast,
            ),
        );

        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 500);
    }, []);

    const addToast = useCallback((message: string, variant: ToastVariant) => {
        const id = `toast-${++idCounter.current}`;

        setToasts((prev) => [...prev, { id, message, variant, visible: false }]);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setToasts((prev) =>
                    prev.map((toast) =>
                        toast.id === id ? { ...toast, visible: true } : toast,
                    ),
                );
            });
        });
    }, []);

    useEffect(() => {
        globalAddToast = addToast;

        return () => {
            globalAddToast = null;
        };
    }, [addToast]);

    return (
        <>
            {children}
            {typeof document !== 'undefined'
                ? createPortal(
                      <div className="fixed top-4 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-1.5">
                          {toasts.map((item) => (
                              <Toast key={item.id} item={item} onRemove={removeToast} />
                          ))}
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}

const toast = {
    success: (message: string) => globalAddToast?.(message, 'success'),
    error: (message: string) => globalAddToast?.(message, 'error'),
    info: (message: string) => globalAddToast?.(message, 'default'),
    message: (message: string) => globalAddToast?.(message, 'default'),
};

export { Toaster, toast };
