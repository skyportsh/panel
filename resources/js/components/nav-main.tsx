import { Link } from '@inertiajs/react';
import { ChevronRight, Pin } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import type { SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import { edit as editPreferences } from '@/routes/preferences';
import type { NavItem } from '@/types';

function NavMainItem({ item, index }: { item: NavItem; index: number }) {
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();
    const { isMobile, state } = useSidebar();
    const hasChildren = Boolean(item.items && item.items.length > 0);
    const hasActiveChild =
        item.items?.some(
            (subItem) => subItem.href && isCurrentOrParentUrl(subItem.href),
        ) ?? false;
    const isCollapsed = !isMobile && state === 'collapsed';
    const subIndicatorStorageKey = `nav-sub-indicator:${item.title}`;
    const subIndexStorageKey = `nav-sub-active-index:${item.title}`;
    const pinnedStorageKey = `nav-pinned:${item.title}`;
    const [isPinned, setIsPinned] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return window.localStorage.getItem(pinnedStorageKey) === 'true';
    });
    const [isOpen, setIsOpen] = useState(hasActiveChild || isPinned);
    const [pinModalOpen, setPinModalOpen] = useState(false);

    const handleOpenChange = (next: boolean) => {
        if (isPinned && !next) {
            return;
        } // prevent closing when pinned

        setIsOpen(next);
    };

    const pin = () => {
        window.localStorage.setItem(pinnedStorageKey, 'true');
        setIsPinned(true);
        setIsOpen(true);
        setPinModalOpen(false);
    };

    const unpin = () => {
        window.localStorage.removeItem(pinnedStorageKey);
        setIsPinned(false);
    };
    const subMenuRef = useRef<HTMLDivElement | null>(null);
    const [activeIndicator, setActiveIndicator] = useState<{
        height: number;
        opacity: number;
        top: number;
    }>(() => {
        if (typeof window === 'undefined') {
            return {
                height: 0,
                opacity: 0,
                top: 0,
            };
        }

        try {
            const stored = hasActiveChild
                ? window.sessionStorage.getItem(subIndicatorStorageKey)
                : null;

            if (!stored) {
                return {
                    height: 0,
                    opacity: 0,
                    top: 0,
                };
            }

            return JSON.parse(stored) as {
                height: number;
                opacity: number;
                top: number;
            };
        } catch {
            return {
                height: 0,
                opacity: 0,
                top: 0,
            };
        }
    });
    const isEffectivelyOpen = isOpen || hasActiveChild || isPinned;
    const scheduleActiveIndicator = useCallback(
        (updater: SetStateAction<typeof activeIndicator>): number | null => {
            if (typeof window === 'undefined') {
                return null;
            }

            return window.requestAnimationFrame(() => {
                setActiveIndicator(updater);
            });
        },
        [],
    );

    const getStoredSubIndicator = useCallback((): {
        height: number;
        opacity: number;
        top: number;
    } | null => {
        if (typeof window === 'undefined') {
            return null;
        }

        try {
            const stored = window.sessionStorage.getItem(
                subIndicatorStorageKey,
            );

            if (!stored) {
                return null;
            }

            return JSON.parse(stored) as {
                height: number;
                opacity: number;
                top: number;
            };
        } catch {
            return null;
        }
    }, [subIndicatorStorageKey]);

    useLayoutEffect(() => {
        if (!isEffectivelyOpen || !item.items) {
            return;
        }

        const activeIndex = item.items.findIndex(
            (subItem) => subItem.href && isCurrentUrl(subItem.href),
        );

        if (activeIndex < 0) {
            const frame = scheduleActiveIndicator((current) => ({
                ...current,
                opacity: 0,
            }));

            return () => {
                if (frame !== null) {
                    window.cancelAnimationFrame(frame);
                }
            };
        }

        const getIndicatorMetrics = (targetIndex: number) => {
            const activeElement =
                subMenuRef.current?.querySelector<HTMLLIElement>(
                    `[data-sub-item-index="${targetIndex}"]`,
                );

            if (!activeElement || !subMenuRef.current) {
                return null;
            }

            const menuRect = subMenuRef.current.getBoundingClientRect();
            const activeRect = activeElement.getBoundingClientRect();

            return {
                height: Math.max(activeRect.height - 6, 18),
                opacity: 1,
                top: activeRect.top - menuRect.top + 3,
            };
        };

        const targetIndicator = getIndicatorMetrics(activeIndex);

        if (!targetIndicator) {
            return;
        }

        const storedIndicator = getStoredSubIndicator();
        const previousIndex = Number.parseInt(
            window.sessionStorage.getItem(subIndexStorageKey) ?? '',
            10,
        );
        const previousIndicator = Number.isNaN(previousIndex)
            ? null
            : getIndicatorMetrics(previousIndex);

        if (previousIndex !== activeIndex) {
            const startingIndicator = storedIndicator ?? previousIndicator;

            if (!startingIndicator) {
                const frame = scheduleActiveIndicator(targetIndicator);
                window.sessionStorage.setItem(
                    subIndicatorStorageKey,
                    JSON.stringify(targetIndicator),
                );
                window.sessionStorage.setItem(
                    subIndexStorageKey,
                    String(activeIndex),
                );

                return () => {
                    if (frame !== null) {
                        window.cancelAnimationFrame(frame);
                    }
                };
            }

            const initialFrame = scheduleActiveIndicator(startingIndicator);
            const targetFrame = window.requestAnimationFrame(() => {
                scheduleActiveIndicator(targetIndicator);
                window.sessionStorage.setItem(
                    subIndicatorStorageKey,
                    JSON.stringify(targetIndicator),
                );
            });

            window.sessionStorage.setItem(
                subIndexStorageKey,
                String(activeIndex),
            );

            return () => {
                if (initialFrame !== null) {
                    window.cancelAnimationFrame(initialFrame);
                }

                window.cancelAnimationFrame(targetFrame);
            };
        }

        const frame = scheduleActiveIndicator(targetIndicator);
        window.sessionStorage.setItem(subIndexStorageKey, String(activeIndex));
        window.sessionStorage.setItem(
            subIndicatorStorageKey,
            JSON.stringify(targetIndicator),
        );

        return () => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }
        };
    }, [
        getStoredSubIndicator,
        isCurrentUrl,
        isEffectivelyOpen,
        item.items,
        scheduleActiveIndicator,
        subIndexStorageKey,
        subIndicatorStorageKey,
    ]);

    useEffect(() => {
        if (!isEffectivelyOpen || !item.items) {
            return;
        }

        const activeIndex = item.items.findIndex(
            (subItem) => subItem.href && isCurrentUrl(subItem.href),
        );

        if (activeIndex < 0) {
            return;
        }

        const updateIndicator = () => {
            const activeElement =
                subMenuRef.current?.querySelector<HTMLLIElement>(
                    `[data-sub-item-index="${activeIndex}"]`,
                );

            if (!activeElement || !subMenuRef.current) {
                return;
            }

            const menuRect = subMenuRef.current.getBoundingClientRect();
            const activeRect = activeElement.getBoundingClientRect();

            const indicator = {
                height: Math.max(activeRect.height - 6, 18),
                opacity: 1,
                top: activeRect.top - menuRect.top + 3,
            };

            scheduleActiveIndicator(indicator);
            window.sessionStorage.setItem(
                subIndicatorStorageKey,
                JSON.stringify(indicator),
            );
        };

        updateIndicator();

        window.addEventListener('resize', updateIndicator);

        return () => {
            window.removeEventListener('resize', updateIndicator);
        };
    }, [
        isCurrentUrl,
        isEffectivelyOpen,
        item.items,
        scheduleActiveIndicator,
        subIndicatorStorageKey,
    ]);

    if (!hasChildren && item.href) {
        return (
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isCurrentUrl(item.href)}
                    tooltip={{ children: item.title }}
                    className={cn(
                        'relative z-10 bg-transparent text-sidebar-foreground/70 hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent data-[active=true]:text-sidebar-accent-foreground',
                        isCollapsed && isCurrentUrl(item.href)
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'data-[active=true]:bg-transparent',
                    )}
                    data-main-trigger-index={index}
                >
                    <Link href={item.href} prefetch>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    }

    if (!hasChildren) {
        return null;
    }

    if (isCollapsed) {
        return (
            <DropdownMenu>
                <SidebarMenuItem>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            isActive={hasActiveChild}
                            tooltip={{ children: item.title }}
                            className={cn(
                                'relative z-10 bg-transparent text-sidebar-foreground/70 hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent data-[active=true]:text-sidebar-accent-foreground',
                                hasActiveChild
                                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                    : 'data-[active=true]:bg-transparent',
                            )}
                            data-main-trigger-index={index}
                        >
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        side="right"
                        align="start"
                        sideOffset={12}
                        className="min-w-48 rounded-xl"
                    >
                        {item.items?.map((subItem) => (
                            <DropdownMenuItem
                                key={subItem.title}
                                asChild
                                className={cn(
                                    'cursor-pointer rounded-lg text-sidebar-foreground focus:bg-sidebar-accent focus:text-sidebar-accent-foreground',
                                    subItem.href && isCurrentUrl(subItem.href)
                                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                                        : '',
                                )}
                            >
                                <Link href={subItem.href ?? '#'} prefetch>
                                    {subItem.title}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </SidebarMenuItem>
            </DropdownMenu>
        );
    }

    return (
        <>
            <Collapsible
                open={isEffectivelyOpen}
                onOpenChange={handleOpenChange}
                className="group/collapsible"
            >
                <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                            isActive={hasActiveChild}
                            tooltip={{ children: item.title }}
                            className={cn(
                                'group/menu-button relative z-10 bg-transparent hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent data-[active=true]:bg-transparent data-[state=open]:bg-transparent',
                                hasActiveChild
                                    ? 'text-sidebar-accent-foreground'
                                    : 'text-sidebar-foreground/70',
                            )}
                            data-main-trigger-index={index}
                        >
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();

                                    if (isPinned) {
                                        unpin();
                                    } else {
                                        setPinModalOpen(true);
                                    }
                                }}
                                className={cn(
                                    'mr-0.5 ml-auto cursor-pointer rounded p-0.5 transition-[opacity,background-color] group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent',
                                    isPinned
                                        ? 'opacity-100'
                                        : 'opacity-0 group-hover/menu-button:opacity-60 hover:!opacity-100',
                                )}
                                aria-label={
                                    isPinned
                                        ? `Unpin ${item.title}`
                                        : `Pin ${item.title}`
                                }
                            >
                                <Pin
                                    className="h-3 w-3"
                                    fill={isPinned ? 'currentColor' : 'none'}
                                />
                            </button>
                            <ChevronRight className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:max-h-0 data-[state=closed]:opacity-0 data-[state=open]:max-h-48 data-[state=open]:opacity-100">
                        <div ref={subMenuRef} className="relative">
                            <SidebarMenuSub className="relative mt-1 translate-y-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[state=closed]/collapsible:-translate-y-1">
                                <div
                                    aria-hidden="true"
                                    className="pointer-events-none absolute top-0 left-[-1px] w-px bg-sidebar-foreground transition-[transform,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                                    style={{
                                        height: `${activeIndicator.height}px`,
                                        opacity: isEffectivelyOpen
                                            ? activeIndicator.opacity
                                            : 0,
                                        transform: `translateY(${activeIndicator.top}px)`,
                                    }}
                                />

                                {item.items?.map((subItem, index) => (
                                    <SidebarMenuSubItem
                                        key={subItem.title}
                                        data-sub-item-index={index}
                                    >
                                        {subItem.href ? (
                                            <SidebarMenuSubButton
                                                asChild
                                                isActive={isCurrentUrl(
                                                    subItem.href,
                                                )}
                                                className="bg-transparent text-sidebar-foreground/70 transition-[color] duration-200 ease-out hover:bg-transparent hover:text-sidebar-foreground focus-visible:bg-transparent active:bg-transparent data-[active=true]:bg-transparent data-[active=true]:font-medium data-[active=true]:text-sidebar-foreground"
                                            >
                                                <Link
                                                    href={subItem.href}
                                                    prefetch
                                                >
                                                    <span>{subItem.title}</span>
                                                </Link>
                                            </SidebarMenuSubButton>
                                        ) : null}
                                    </SidebarMenuSubItem>
                                ))}
                            </SidebarMenuSub>
                        </div>
                    </CollapsibleContent>
                </SidebarMenuItem>
            </Collapsible>

            <Dialog open={pinModalOpen} onOpenChange={setPinModalOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            Pin &ldquo;{item.title}&rdquo;?
                        </DialogTitle>
                        <DialogDescription>
                            If you frequently use this service from Skyport, you
                            can also change the default page you&apos;ll be
                            redirected to upon login.{' '}
                            <Link
                                href={editPreferences()}
                                onClick={() => setPinModalOpen(false)}
                                className="underline underline-offset-4"
                            >
                                Manage in Preferences
                            </Link>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => setPinModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={pin}>Pin</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function NavMain({
    items = [],
    label = 'Platform',
}: {
    items: NavItem[];
    label?: string;
}) {
    const { currentUrl, isCurrentOrParentUrl, isCurrentUrl } = useCurrentUrl();
    const menuRef = useRef<HTMLDivElement | null>(null);
    const isItemActive = useCallback(
        (item: NavItem): boolean => {
            if (item.href && isCurrentUrl(item.href)) {
                return true;
            }

            return (
                item.items?.some(
                    (subItem) =>
                        subItem.href && isCurrentOrParentUrl(subItem.href),
                ) ?? false
            );
        },
        [isCurrentOrParentUrl, isCurrentUrl],
    );
    const hasActiveItem = items.some((item) => {
        return isItemActive(item);
    });
    const [activeIndicator, setActiveIndicator] = useState<{
        height: number;
        opacity: number;
        top: number;
    }>(() => {
        if (typeof window === 'undefined' || !hasActiveItem) {
            return {
                height: 0,
                opacity: 0,
                top: 0,
            };
        }

        try {
            const stored = window.sessionStorage.getItem('nav-main-indicator');

            if (!stored) {
                return {
                    height: 0,
                    opacity: 0,
                    top: 0,
                };
            }

            return JSON.parse(stored) as {
                height: number;
                opacity: number;
                top: number;
            };
        } catch {
            return {
                height: 0,
                opacity: 0,
                top: 0,
            };
        }
    });
    const scheduleActiveIndicator = useCallback(
        (updater: SetStateAction<typeof activeIndicator>): number | null => {
            if (typeof window === 'undefined') {
                return null;
            }

            return window.requestAnimationFrame(() => {
                setActiveIndicator(updater);
            });
        },
        [],
    );

    useLayoutEffect(() => {
        const activeIndex = items.findIndex(isItemActive);

        if (activeIndex < 0) {
            const frame = scheduleActiveIndicator((current) => ({
                ...current,
                opacity: 0,
            }));

            return () => {
                if (frame !== null) {
                    window.cancelAnimationFrame(frame);
                }
            };
        }

        const getIndicatorMetrics = (index: number) => {
            const activeElement = menuRef.current?.querySelector<HTMLElement>(
                `[data-main-trigger-index="${index}"]`,
            );

            if (!activeElement || !menuRef.current) {
                return null;
            }

            const menuRect = menuRef.current.getBoundingClientRect();
            const activeRect = activeElement.getBoundingClientRect();

            return {
                height: activeRect.height,
                opacity: 1,
                top: activeRect.top - menuRect.top,
            };
        };

        const targetIndicator = getIndicatorMetrics(activeIndex);

        if (!targetIndicator) {
            return;
        }

        const previousIndex = Number.parseInt(
            window.sessionStorage.getItem('nav-main-active-index') ?? '',
            10,
        );
        const previousIndicator = Number.isNaN(previousIndex)
            ? null
            : getIndicatorMetrics(previousIndex);

        if (previousIndicator && previousIndex !== activeIndex) {
            const initialFrame = scheduleActiveIndicator(previousIndicator);
            const targetFrame = window.requestAnimationFrame(() => {
                scheduleActiveIndicator(targetIndicator);
                window.sessionStorage.setItem(
                    'nav-main-indicator',
                    JSON.stringify(targetIndicator),
                );
            });

            window.sessionStorage.setItem(
                'nav-main-active-index',
                String(activeIndex),
            );

            return () => {
                if (initialFrame !== null) {
                    window.cancelAnimationFrame(initialFrame);
                }

                window.cancelAnimationFrame(targetFrame);
            };
        }

        const frame = scheduleActiveIndicator(targetIndicator);
        window.sessionStorage.setItem(
            'nav-main-active-index',
            String(activeIndex),
        );
        window.sessionStorage.setItem(
            'nav-main-indicator',
            JSON.stringify(targetIndicator),
        );

        return () => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }
        };
    }, [currentUrl, isItemActive, items, scheduleActiveIndicator]);

    useEffect(() => {
        const activeIndex = items.findIndex(isItemActive);

        if (activeIndex < 0) {
            return;
        }

        const updateIndicator = () => {
            const activeElement = menuRef.current?.querySelector<HTMLElement>(
                `[data-main-trigger-index="${activeIndex}"]`,
            );

            if (!activeElement || !menuRef.current) {
                return;
            }

            const menuRect = menuRef.current.getBoundingClientRect();
            const activeRect = activeElement.getBoundingClientRect();

            scheduleActiveIndicator({
                height: activeRect.height,
                opacity: 1,
                top: activeRect.top - menuRect.top,
            });
        };

        updateIndicator();

        window.addEventListener('resize', updateIndicator);

        const observer = new ResizeObserver(updateIndicator);

        if (menuRef.current) {
            observer.observe(menuRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateIndicator);
            observer.disconnect();
        };
    }, [currentUrl, isItemActive, items, scheduleActiveIndicator]);

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>{label}</SidebarGroupLabel>
            <div ref={menuRef} className="relative">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 z-0 rounded-md bg-sidebar-accent transition-[transform,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[collapsible=icon]:hidden"
                    style={{
                        height: `${activeIndicator.height}px`,
                        opacity: activeIndicator.opacity,
                        transform: `translateY(${activeIndicator.top}px)`,
                    }}
                />
                <SidebarMenu>
                    {items.map((item, index) => (
                        <NavMainItem
                            key={item.title}
                            item={item}
                            index={index}
                        />
                    ))}
                </SidebarMenu>
            </div>
        </SidebarGroup>
    );
}
