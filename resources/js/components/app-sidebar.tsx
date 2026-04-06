import { Link, usePage } from '@inertiajs/react';
import { index as adminCargo } from '@/actions/App/Http/Controllers/Admin/CargoController';
import { index as adminDashboard } from '@/actions/App/Http/Controllers/Admin/DashboardController';
import { index as adminLocations } from '@/actions/App/Http/Controllers/Admin/LocationsController';
import { index as adminNodes } from '@/actions/App/Http/Controllers/Admin/NodesController';
import { index as adminServers } from '@/actions/App/Http/Controllers/Admin/ServersController';
import { index as adminSettings } from '@/actions/App/Http/Controllers/Admin/SettingsController';
import { index as adminUsers } from '@/actions/App/Http/Controllers/Admin/UsersController';
import CargoIcon from '@/components/cargo-icon';
import DashboardIcon from '@/components/dashboard-icon';
import LocationsIcon from '@/components/locations-icon';
import { NavMain } from '@/components/nav-main';
import NodesIcon from '@/components/nodes-icon';
import ServerIcon from '@/components/server-icon';
import SettingsIcon from '@/components/settings-icon';
import { NavUser } from '@/components/nav-user';
import UsersIcon from '@/components/users-icon';
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
import type { NavItem } from '@/types';

export function AppSidebar() {
    const page = usePage();
    const { auth, name } = page.props;
    const isAdminSidebar = auth.user.is_admin && page.url.startsWith('/admin');
    const mainNavItems: NavItem[] = isAdminSidebar
        ? [
              {
                  title: 'Overview',
                  href: adminDashboard.url(),
                  icon: DashboardIcon,
              },
              {
                  title: 'Users',
                  href: adminUsers.url(),
                  icon: UsersIcon,
              },
              {
                  title: 'Cargo',
                  href: adminCargo.url(),
                  icon: CargoIcon,
              },
              {
                  title: 'Locations',
                  href: adminLocations.url(),
                  icon: LocationsIcon,
              },
              {
                  title: 'Nodes',
                  href: adminNodes.url(),
                  icon: NodesIcon,
              },
              {
                  title: 'Servers',
                  href: adminServers.url(),
                  icon: ServerIcon,
              },
              {
                  title: 'Settings',
                  href: adminSettings.url(),
                  icon: SettingsIcon,
              },
          ]
        : [
              {
                  title: 'Home',
                  href: home(),
                  icon: DashboardIcon,
              },
          ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={home()} prefetch>
                                <div className="relative flex h-8 w-full items-center overflow-hidden group-data-[collapsible=icon]:justify-center">
                                    <span className="text-lg tracking-tight font-semibold group-data-[collapsible=icon]:hidden">
                                        {name}
                                    </span>
                                    <img
                                        src="https://i.ibb.co/qL4qgHB4/ETHER-2026-04-04-T141225-676.png"
                                        className="absolute h-7 w-7 rounded object-contain opacity-0 invert transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[collapsible=icon]:scale-100 group-data-[collapsible=icon]:opacity-100 group-data-[state=expanded]:scale-90 dark:invert-0"
                                    />
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain
                    items={mainNavItems}
                    label={isAdminSidebar ? 'Admin' : 'Platform'}
                />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
