import { AnnouncementBanner } from '@/components/announcement-banner';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { NodeOfflineOverlay } from '@/components/node-offline-overlay';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent
                variant="sidebar"
                className="relative overflow-x-hidden"
            >
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <AnnouncementBanner />
                {children}
                <NodeOfflineOverlay />
            </AppContent>
        </AppShell>
    );
}
