import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

const SIDEBAR_COOKIE_NAME = 'sidebar_state';

function getSidebarPreference(fallback: boolean): boolean {
    if (typeof document === 'undefined') {
        return fallback;
    }

    const cookie = document.cookie
        .split('; ')
        .find((item) => item.startsWith(`${SIDEBAR_COOKIE_NAME}=`));

    if (!cookie) {
        return fallback;
    }

    return cookie.slice(cookie.indexOf('=') + 1) === 'true';
}

export function AppShell({ children, variant = 'sidebar' }: Props) {
    const { sidebarOpen } = usePage().props;
    const [isOpen, setIsOpen] = useState(() =>
        getSidebarPreference(sidebarOpen),
    );

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">
                {children}
                <Toaster />
            </div>
        );
    }

    return (
        <SidebarProvider open={isOpen} onOpenChange={setIsOpen}>
            {children}
            <Toaster />
        </SidebarProvider>
    );
}
