import { Link } from '@inertiajs/react';
import { BookOpen, FolderGit2 } from 'lucide-react';
import { index as domains } from '@/actions/App/Http/Controllers/GameHosting/DomainsController';
import { index as earnCredits } from '@/actions/App/Http/Controllers/GameHosting/EarnCreditsController';
import { index as resources } from '@/actions/App/Http/Controllers/GameHosting/ResourcesController';
import { index as gameServers } from '@/actions/App/Http/Controllers/GameHosting/ServersController';
import DashboardIcon from '@/components/dashboard-icon';
import GameHostingIcon from '@/components/game-hosting-icon';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import PublicCloudIcon from '@/components/public-cloud-icon';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { home } from '@/routes';
import { settings, virtualServers } from '@/routes/compute';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Home',
        href: home(),
        icon: DashboardIcon,
    },
    {
        title: 'Compute',
        icon: PublicCloudIcon,
        items: [
            {
                title: 'Virtual servers',
                href: virtualServers(),
            },
            {
                title: 'Settings',
                href: settings(),
            },
        ],
    },
    {
        title: 'Game hosting',
        icon: GameHostingIcon,
        items: [
            {
                title: 'Servers',
                href: gameServers.url(),
            },
            {
                title: 'Domains',
                href: domains.url(),
            },
            {
                title: 'Resources',
                href: resources.url(),
            },
            {
                title: 'Earn credits',
                href: earnCredits.url(),
            },
        ],
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: FolderGit2,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={home()} prefetch>
                                <div className="relative flex h-10 w-full items-center overflow-hidden group-data-[collapsible=icon]:justify-center">
                                    <img
                                        src="https://i.ibb.co/jZv6zxwd/Ether-2026-03-20-T132438-854.png"
                                        className="h-8 w-auto origin-left invert transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[collapsible=icon]:scale-90 group-data-[collapsible=icon]:opacity-0 dark:invert-0"
                                    />
                                    <img
                                        src="https://i.ibb.co/dwfZ7Mc0/ETHER-2026-03-18-T170407-214.png"
                                        className="absolute h-7 w-7 rounded object-contain opacity-0 invert transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[collapsible=icon]:scale-100 group-data-[collapsible=icon]:opacity-100 group-data-[state=expanded]:scale-90 dark:invert-0"
                                    />
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
