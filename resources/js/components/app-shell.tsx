import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { WelcomeOverlay } from '@/components/welcome-overlay';
import { resolveLandingUrl } from '@/lib/default-landing-pages';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

export function AppShell({ children, variant = 'sidebar' }: Props) {
    const { sidebarOpen, auth } = usePage().props;
    const isOpen = sidebarOpen;

    const [showWelcome] = useState(() => {
        if (
            typeof window !== 'undefined' &&
            sessionStorage.getItem('show_welcome')
        ) {
            sessionStorage.removeItem('show_welcome');

            return true;
        }

        return false;
    });
    const [welcomeVisible, setWelcomeVisible] = useState(showWelcome);

    const handleWelcomeDone = () => {
        setWelcomeVisible(false);

        if (showWelcome && typeof window !== 'undefined') {
            const preferred = localStorage.getItem('default-landing-url');
            const target = resolveLandingUrl(preferred, auth.user.is_admin);

            if (target !== window.location.pathname) {
                router.visit(target, { replace: true });
            }
        }
    };

    const overlay =
        welcomeVisible && auth?.user ? (
            <WelcomeOverlay name={auth.user.name} onDone={handleWelcomeDone} />
        ) : null;

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">
                {children}
                <Toaster />
                {overlay}
            </div>
        );
    }

    return (
        <SidebarProvider defaultOpen={isOpen}>
            {children}
            <Toaster />
            {overlay}
        </SidebarProvider>
    );
}
