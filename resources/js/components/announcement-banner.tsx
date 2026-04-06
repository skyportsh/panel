import { usePage } from '@inertiajs/react';
import { Megaphone } from 'lucide-react';

export function AnnouncementBanner() {
    const { announcement } = usePage().props as {
        announcement?: string | null;
    };

    if (!announcement) {
        return null;
    }

    return (
        <div className="mx-4 mt-4">
            <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                <div className="p-2">
                    <div className="rounded-md bg-sidebar p-1">
                        <div className="flex items-center gap-3 rounded-md border border-sidebar-accent bg-background px-4 py-3">
                            <Megaphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-sm text-foreground">
                                {announcement}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
