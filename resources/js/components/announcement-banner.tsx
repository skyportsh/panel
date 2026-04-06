import { usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle,
    Info,
    Megaphone,
    ShieldAlert,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { cn } from '@/lib/utils';

type AnnouncementType =
    | 'success'
    | 'warning'
    | 'alert'
    | 'update'
    | 'information';

const typeConfig: Record<
    AnnouncementType,
    {
        icon: typeof Info;
        bg: string;
        text: string;
        stroke: string;
    }
> = {
    success: {
        icon: CheckCircle,
        bg: 'bg-emerald-950',
        text: 'text-emerald-100',
        stroke: '[&_path]:stroke-emerald-400/30',
    },
    warning: {
        icon: AlertTriangle,
        bg: 'bg-amber-950',
        text: 'text-amber-100',
        stroke: '[&_path]:stroke-amber-400/30',
    },
    alert: {
        icon: ShieldAlert,
        bg: 'bg-red-950',
        text: 'text-red-100',
        stroke: '[&_path]:stroke-red-400/30',
    },
    update: {
        icon: Megaphone,
        bg: 'bg-purple-950',
        text: 'text-purple-100',
        stroke: '[&_path]:stroke-purple-400/30',
    },
    information: {
        icon: Info,
        bg: 'bg-sky-950',
        text: 'text-sky-100',
        stroke: '[&_path]:stroke-sky-400/30',
    },
};

export { typeConfig };
export type { AnnouncementType };

export function AnnouncementBanner() {
    const { announcement, announcementType, announcementDismissable } =
        usePage().props as {
            announcement?: string | null;
            announcementType?: AnnouncementType;
            announcementDismissable?: boolean;
        };
    const [dismissed, setDismissed] = useState(false);

    if (!announcement || dismissed) {
        return null;
    }

    const config = typeConfig[announcementType ?? 'information'];
    const Icon = config.icon;

    return (
        <div className="mx-4 mt-4">
            <div className="relative overflow-hidden rounded-xl border border-white/[0.08]">
                <div
                    className={cn(
                        'pointer-events-none absolute inset-0',
                        config.bg,
                    )}
                />
                <PlaceholderPattern
                    patternSize={7}
                    className={cn(
                        'pointer-events-none absolute inset-0 opacity-[0.15]',
                        config.stroke,
                    )}
                />
                <div
                    className={cn(
                        'relative z-10 flex items-center gap-3 px-4 py-3',
                        config.text,
                    )}
                >
                    <Icon className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="flex-1 text-sm font-medium">
                        {announcement}
                    </span>
                    {announcementDismissable && (
                        <button
                            type="button"
                            onClick={() => setDismissed(true)}
                            className="shrink-0 cursor-pointer rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
