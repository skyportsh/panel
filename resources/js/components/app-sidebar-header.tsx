import { Form, usePage } from '@inertiajs/react';
import { UserRoundX } from 'lucide-react';
import { stopImpersonating } from '@/routes/admin';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { impersonating, auth } = usePage().props;

    return (
        <>
            {impersonating && (
                <div className="flex items-center justify-between gap-3 border-b border-amber-300/60 bg-amber-50 px-4 py-2 dark:border-amber-700/40 dark:bg-amber-950/40">
                    <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                        <UserRoundX className="h-3.5 w-3.5 shrink-0" />
                        <span>
                            Impersonating{' '}
                            <span className="font-semibold">
                                {auth.user.name}
                            </span>
                        </span>
                    </div>
                    <Form {...stopImpersonating()}>
                        {() => (
                            <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
                            >
                                Stop impersonating
                            </Button>
                        )}
                    </Form>
                </div>
            )}
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="-ml-1" />
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </header>
        </>
    );
}
