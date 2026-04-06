import { Link } from '@inertiajs/react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editActivity } from '@/routes/activity';
import { edit as editPreferences } from '@/routes/preferences';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import { edit as editSessions } from '@/routes/sessions';
import type { NavItem } from '@/types';

const sidebarNavItems: Array<NavItem & { href: NonNullable<NavItem['href']> }> =
    [
        {
            title: 'Profile',
            href: edit(),
            icon: null,
        },
        {
            title: 'Security',
            href: editSecurity(),
            icon: null,
        },
        {
            title: 'Sessions',
            href: editSessions(),
            icon: null,
        },
        {
            title: 'Activity',
            href: editActivity(),
            icon: null,
        },
        {
            title: 'Preferences',
            href: editPreferences(),
            icon: null,
        },
    ];

type SettingsLayoutProps = PropsWithChildren<{
    contentClassName?: string;
    sectionClassName?: string;
}>;

export default function SettingsLayout({
    children,
    contentClassName,
    sectionClassName,
}: SettingsLayoutProps) {
    const { currentUrl, isCurrentOrParentUrl } = useCurrentUrl();
    const navRef = useRef<HTMLElement | null>(null);
    const [activeIndicator, setActiveIndicator] = useState<{
        height: number;
        opacity: number;
        top: number;
    }>(() => {
        try {
            const stored = window.sessionStorage.getItem(
                'settings-nav-indicator',
            );

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
    const scheduleActiveIndicator = (
        updater:
            | {
                  height: number;
                  opacity: number;
                  top: number;
              }
            | ((current: { height: number; opacity: number; top: number }) => {
                  height: number;
                  opacity: number;
                  top: number;
              }),
    ): number | null => {
        if (typeof window === 'undefined') {
            return null;
        }

        return window.requestAnimationFrame(() => {
            setActiveIndicator(updater);
        });
    };

    useLayoutEffect(() => {
        const activeIndex = sidebarNavItems.findIndex((item) =>
            isCurrentOrParentUrl(item.href),
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

        const getIndicatorMetrics = (index: number) => {
            const activeElement = navRef.current?.querySelector<HTMLElement>(
                `[data-settings-nav-item-index="${index}"]`,
            );

            if (!activeElement || !navRef.current) {
                return null;
            }

            const navRect = navRef.current.getBoundingClientRect();
            const activeRect = activeElement.getBoundingClientRect();

            return {
                height: activeRect.height,
                opacity: 1,
                top: activeRect.top - navRect.top,
            };
        };

        const targetIndicator = getIndicatorMetrics(activeIndex);

        if (!targetIndicator) {
            return;
        }

        const previousIndex = Number.parseInt(
            window.sessionStorage.getItem('settings-nav-active-index') ?? '',
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
                    'settings-nav-indicator',
                    JSON.stringify(targetIndicator),
                );
            });

            window.sessionStorage.setItem(
                'settings-nav-active-index',
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
            'settings-nav-active-index',
            String(activeIndex),
        );
        window.sessionStorage.setItem(
            'settings-nav-indicator',
            JSON.stringify(targetIndicator),
        );

        return () => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }
        };
    }, [currentUrl, isCurrentOrParentUrl]);

    useEffect(() => {
        const activeIndex = sidebarNavItems.findIndex((item) =>
            isCurrentOrParentUrl(item.href),
        );

        if (activeIndex < 0) {
            return;
        }

        const updateIndicator = () => {
            const activeElement = navRef.current?.querySelector<HTMLElement>(
                `[data-settings-nav-item-index="${activeIndex}"]`,
            );

            if (!activeElement || !navRef.current) {
                return;
            }

            const navRect = navRef.current.getBoundingClientRect();
            const activeRect = activeElement.getBoundingClientRect();

            scheduleActiveIndicator({
                height: activeRect.height,
                opacity: 1,
                top: activeRect.top - navRect.top,
            });
        };

        updateIndicator();

        window.addEventListener('resize', updateIndicator);

        return () => {
            window.removeEventListener('resize', updateIndicator);
        };
    }, [currentUrl, isCurrentOrParentUrl]);

    return (
        <div className="px-4 py-6">
            <Heading
                title="Settings"
                description="Manage your profile and account settings"
            />

            <div className="flex flex-col lg:flex-row lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav
                        ref={navRef}
                        className="relative flex flex-col space-y-1 space-x-0"
                        aria-label="Settings"
                    >
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-x-0 z-0 rounded-md bg-muted transition-[transform,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                            style={{
                                height: `${activeIndicator.height}px`,
                                opacity: activeIndicator.opacity,
                                transform: `translateY(${activeIndicator.top}px)`,
                            }}
                        />
                        {sidebarNavItems.map((item, index) => (
                            <Link
                                key={`${toUrl(item.href)}-${index}`}
                                href={item.href}
                                className={cn(
                                    buttonVariants({
                                        size: 'sm',
                                        variant: 'ghost',
                                    }),
                                    'relative z-10 w-full justify-start bg-transparent text-muted-foreground hover:bg-transparent hover:text-foreground active:bg-transparent',
                                    isCurrentOrParentUrl(item.href)
                                        ? 'bg-transparent font-medium text-foreground'
                                        : 'bg-transparent',
                                )}
                                data-settings-nav-item-index={index}
                            >
                                {item.icon && <item.icon className="h-4 w-4" />}
                                {item.title}
                            </Link>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className={cn('flex-1 md:max-w-2xl', contentClassName)}>
                    <section
                        className={cn('max-w-xl space-y-12', sectionClassName)}
                    >
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
