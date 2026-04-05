import { usePage } from '@inertiajs/react';
import AuthPaneArt from '@/components/auth-pane-art';
import type { AuthLayoutProps } from '@/types';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;

    return (
        <div className="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col overflow-hidden border-r border-black/8 p-10 text-[#1b1b18] lg:flex dark:border-white/8 dark:text-white">
                <AuthPaneArt />
                <div className="relative z-20 text-lg font-medium">{name}</div>
                <div className="relative z-20 mt-auto max-w-sm">
                    <p className="text-sm leading-6 text-black/55 dark:text-white/60">
                        Skyport cloud infrastructure and account access in one
                        place.
                    </p>
                </div>
            </div>
            <div className="w-full lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="text-[1.375rem] font-semibold">
                            {title}
                        </h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
