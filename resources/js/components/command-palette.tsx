import { router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import AuditLogIcon from '@/components/audit-log-icon';
import CargoIcon from '@/components/cargo-icon';
import DashboardIcon from '@/components/dashboard-icon';
import LocationsIcon from '@/components/locations-icon';
import NodesIcon from '@/components/nodes-icon';
import ServerIcon from '@/components/server-icon';
import SettingsIcon from '@/components/settings-icon';
import UsersIcon from '@/components/users-icon';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { index as adminCargo } from '@/routes/admin/cargo';
import { index as adminLocations } from '@/routes/admin/locations';
import { index as adminNodes } from '@/routes/admin/nodes';
import { index as adminServers } from '@/routes/admin/servers';
import { index as adminSettings } from '@/routes/admin/settings';
import { index as adminUsers } from '@/routes/admin/users';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

type CommandItem = {
    group: string;
    href: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>> | null;
    keywords: string;
    title: string;
};

function buildCommands(isAdmin: boolean): CommandItem[] {
    const items: CommandItem[] = [
        {
            group: 'Navigation',
            title: 'Home',
            href: home(),
            icon: DashboardIcon,
            keywords: 'home dashboard servers',
        },
        {
            group: 'Settings',
            title: 'Profile',
            href: editProfile(),
            icon: SettingsIcon,
            keywords: 'profile name email account',
        },
        {
            group: 'Settings',
            title: 'Security',
            href: editSecurity(),
            icon: SettingsIcon,
            keywords: 'security password 2fa passkey',
        },
    ];

    if (isAdmin) {
        items.push(
            {
                group: 'Admin',
                title: 'Overview',
                href: '/admin',
                icon: DashboardIcon,
                keywords: 'admin overview dashboard stats',
            },
            {
                group: 'Admin',
                title: 'Users',
                href: adminUsers.url(),
                icon: UsersIcon,
                keywords: 'admin users accounts manage',
            },
            {
                group: 'Admin',
                title: 'Cargo',
                href: adminCargo.url(),
                icon: CargoIcon,
                keywords: 'admin cargo templates images',
            },
            {
                group: 'Admin',
                title: 'Locations',
                href: adminLocations.url(),
                icon: LocationsIcon,
                keywords: 'admin locations regions',
            },
            {
                group: 'Admin',
                title: 'Nodes',
                href: adminNodes.url(),
                icon: NodesIcon,
                keywords: 'admin nodes machines hardware',
            },
            {
                group: 'Admin',
                title: 'Servers',
                href: adminServers.url(),
                icon: ServerIcon,
                keywords: 'admin servers instances',
            },
            {
                group: 'Admin',
                title: 'Activity',
                href: '/admin/audit-log',
                icon: AuditLogIcon,
                keywords: 'admin audit log activity',
            },
            {
                group: 'Admin',
                title: 'Settings',
                href: adminSettings.url(),
                icon: SettingsIcon,
                keywords: 'admin settings branding announcement',
            },
        );
    }

    return items;
}

function CommandPaletteContent({
    onClose,
}: {
    onClose: () => void;
}) {
    const { auth } = usePage().props;
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const commands = useMemo(
        () => buildCommands(auth.user.is_admin),
        [auth.user.is_admin],
    );

    const filtered = useMemo(() => {
        if (!query.trim()) {
            return commands;
        }

        const q = query.toLowerCase();

        return commands.filter(
            (item) =>
                item.title.toLowerCase().includes(q) ||
                item.keywords.toLowerCase().includes(q) ||
                item.group.toLowerCase().includes(q),
        );
    }, [commands, query]);

    const grouped = useMemo(() => {
        const groups: Record<string, CommandItem[]> = {};

        for (const item of filtered) {
            (groups[item.group] ??= []).push(item);
        }

        return groups;
    }, [filtered]);

    const navigate = useCallback(
        (href: string) => {
            onClose();
            router.visit(href);
        },
        [onClose],
    );

    useEffect(() => {
        setActiveIndex(0);
    }, [query]);

    useEffect(() => {
        const activeEl = listRef.current?.querySelector(
            `[data-command-index="${activeIndex}"]`,
        );

        activeEl?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();

                if (filtered[activeIndex]) {
                    navigate(filtered[activeIndex].href);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        },
        [activeIndex, filtered, navigate, onClose],
    );

    useLayoutEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-sidebar-border/70 bg-background shadow-2xl dark:border-sidebar-border"
            onKeyDown={handleKeyDown}
        >
            <div className="flex items-center gap-3 border-b border-sidebar-border/70 px-4 dark:border-sidebar-border">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search pages..."
                    className="h-12 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                />
                <kbd className="hidden rounded border border-sidebar-accent bg-sidebar px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                    ESC
                </kbd>
            </div>

            <div
                ref={listRef}
                className="max-h-72 overflow-y-auto p-1.5"
            >
                {filtered.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No results found.
                    </div>
                ) : (
                    Object.entries(grouped).map(([group, items]) => (
                        <div key={group}>
                            <div className="px-3 pt-2 pb-1">
                                <span className="text-xs font-medium text-muted-foreground">
                                    {group}
                                </span>
                            </div>
                            {items.map((item) => {
                                const flatIndex = filtered.indexOf(item);
                                const isActive = flatIndex === activeIndex;

                                return (
                                    <button
                                        key={item.href}
                                        type="button"
                                        data-command-index={flatIndex}
                                        className={cn(
                                            'group relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                                            isActive
                                                ? 'text-foreground'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                        onClick={() => navigate(item.href)}
                                        onMouseEnter={() =>
                                            setActiveIndex(flatIndex)
                                        }
                                    >
                                        {isActive && (
                                            <div className="absolute inset-0 rounded-md bg-sidebar">
                                                <PlaceholderPattern
                                                    patternSize={4}
                                                    className="size-full stroke-current opacity-[0.04]"
                                                />
                                            </div>
                                        )}
                                        <span className="relative z-10 flex items-center gap-3">
                                            {item.icon && (
                                                <item.icon className="h-4 w-4 shrink-0" />
                                            )}
                                            <span className="font-medium">
                                                {item.title}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export function CommandPalette() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[100]">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setOpen(false)}
            />
            <div className="relative flex items-start justify-center pt-[20vh]">
                <CommandPaletteContent onClose={() => setOpen(false)} />
            </div>
        </div>
    );
}
