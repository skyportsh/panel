import { useCallback, useEffect, useRef, useState } from 'react';

import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { cn } from '@/lib/utils';

type Tab = {
    id: string;
    label: string;
};

function SlidingTabs({
    tabs,
    active,
    onChange,
    className,
}: {
    tabs: Tab[];
    active: string;
    onChange: (id: string) => void;
    className?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });
    const dragging = useRef(false);
    const startX = useRef(0);

    const updateIndicator = useCallback(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const activeIndex = tabs.findIndex((t) => t.id === active);
        const activeEl = container.querySelector<HTMLElement>(
            `[data-tab-index="${activeIndex}"]`,
        );

        if (!activeEl) {
            return;
        }

        // Use offsetLeft/offsetWidth for pixel-perfect positioning (no sub-pixel issues)
        setIndicator({
            left: activeEl.offsetLeft,
            width: activeEl.offsetWidth,
            opacity: 1,
        });
    }, [active, tabs]);

    useEffect(() => {
        updateIndicator();
    }, [updateIndicator]);

    const getTabAtPoint = useCallback(
        (clientX: number): string | null => {
            const container = containerRef.current;
            if (!container) {
                return null;
            }

            for (let i = 0; i < tabs.length; i++) {
                const el = container.querySelector<HTMLElement>(
                    `[data-tab-index="${i}"]`,
                );
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (clientX >= rect.left && clientX <= rect.right) {
                        return tabs[i].id;
                    }
                }
            }

            return null;
        },
        [tabs],
    );

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        dragging.current = true;
        startX.current = e.clientX;
    }, []);

    const handlePointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!dragging.current) {
                return;
            }

            // Only start dragging after moving a few pixels (avoids interfering with clicks)
            if (Math.abs(e.clientX - startX.current) < 4) {
                return;
            }

            const tabId = getTabAtPoint(e.clientX);
            if (tabId && tabId !== active) {
                onChange(tabId);
            }
        },
        [active, getTabAtPoint, onChange],
    );

    const handlePointerUp = useCallback(() => {
        dragging.current = false;
    }, []);

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative inline-flex select-none overflow-hidden rounded-lg bg-muted/50 py-0.5',
                className,
            )}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-lg border border-border/70 bg-background shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{
                    left: `${indicator.left}px`,
                    width: `${indicator.width}px`,
                    opacity: indicator.opacity,
                }}
            >
                <PlaceholderPattern
                    patternSize={4}
                    className="size-full stroke-current opacity-[0.06]"
                />
            </div>
            {tabs.map((tab, index) => (
                <button
                    key={tab.id}
                    type="button"
                    data-tab-index={index}
                    onClick={() => onChange(tab.id)}
                    onPointerDown={handlePointerDown}
                    className={cn(
                        'relative z-10 cursor-pointer rounded-md px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ease-out active:scale-95 active:duration-0',
                        active === tab.id
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export { SlidingTabs };
export type { Tab };
