import { Link, usePage } from "@inertiajs/react";
import { show as serverConsole } from "@/actions/App/Http/Controllers/Client/ServerConsoleController";
import AuditLogIcon from "@/components/audit-log-icon";
import CargoIcon from "@/components/cargo-icon";
import ConsoleIcon from "@/components/console-icon";
import DashboardIcon from "@/components/dashboard-icon";
import FilesIcon from "@/components/files-icon";
import LocationsIcon from "@/components/locations-icon";
import { NavMain } from "@/components/nav-main";
import NetworkingIcon from "@/components/networking-icon";
import NodesIcon from "@/components/nodes-icon";
import ServerIcon from "@/components/server-icon";
import SettingsIcon from "@/components/settings-icon";
import { NavUser } from "@/components/nav-user";
import UsersIcon from "@/components/users-icon";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { home } from "@/routes";
import { index as adminCargo } from "@/routes/admin/cargo";
import { index as adminLocations } from "@/routes/admin/locations";
import { index as adminNodes } from "@/routes/admin/nodes";
import { index as adminServers } from "@/routes/admin/servers";
import { index as adminSettings } from "@/routes/admin/settings";
import { index as adminUsers } from "@/routes/admin/users";
import type { NavItem } from "@/types";

export function AppSidebar() {
    const page = usePage();
    const { auth, name, server } = page.props as typeof page.props & {
        server?: {
            id: number;
            name: string;
        };
    };
    const isAdminSidebar = auth.user.is_admin && page.url.startsWith("/admin");
    const isServerSidebar = page.url.startsWith("/server/");
    const adminDashboardHref = "/admin";
    const adminActivityHref = "/admin/activity";
    const mainNavItems: NavItem[] = isAdminSidebar
        ? [
              {
                  title: "Overview",
                  href: adminDashboardHref,
                  icon: DashboardIcon,
              },
              {
                  title: "Users",
                  href: adminUsers.url(),
                  icon: UsersIcon,
              },
              {
                  title: "Cargo",
                  href: adminCargo.url(),
                  icon: CargoIcon,
              },
              {
                  title: "Locations",
                  href: adminLocations.url(),
                  icon: LocationsIcon,
              },
              {
                  title: "Nodes",
                  href: adminNodes.url(),
                  icon: NodesIcon,
              },
              {
                  title: "Servers",
                  href: adminServers.url(),
                  icon: ServerIcon,
              },
              {
                  title: "Activity",
                  href: adminActivityHref,
                  icon: AuditLogIcon,
              },
              {
                  title: "Settings",
                  href: adminSettings.url(),
                  icon: SettingsIcon,
              },
          ]
        : isServerSidebar && server
          ? [
                {
                    title: "Console",
                    href: serverConsole.url(server.id),
                    icon: ConsoleIcon,
                },
                {
                    title: "Files",
                    href: `/server/${server.id}/files`,
                    icon: FilesIcon,
                },
                {
                    title: "Networking",
                    icon: NetworkingIcon,
                    pinnable: false,
                    items: [
                        {
                            title: "Allocations",
                            href: `/server/${server.id}/networking/allocations`,
                        },
                        {
                            title: "Firewall",
                            href: `/server/${server.id}/networking/firewall`,
                        },
                        {
                            title: "Interconnect",
                            href: `/server/${server.id}/networking/interconnect`,
                        },
                    ],
                },
                {
                    title: "Settings",
                    href: `/server/${server.id}/settings`,
                    icon: SettingsIcon,
                },
            ]
          : [
                {
                    title: "Home",
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
                    label={
                        isAdminSidebar
                            ? "Admin"
                            : isServerSidebar
                              ? "Server"
                              : "Platform"
                    }
                />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
