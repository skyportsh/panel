import { AnnouncementBanner } from "@/components/announcement-banner";
import { AppContent } from "@/components/app-content";
import { CommandPalette } from "@/components/command-palette";
import { AppShell } from "@/components/app-shell";
import { AppSidebar } from "@/components/app-sidebar";
import { AppSidebarHeader } from "@/components/app-sidebar-header";
import type { AppLayoutProps } from "@/types";

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <AnnouncementBanner />
                {children}
            </AppContent>
            <CommandPalette />
        </AppShell>
    );
}
