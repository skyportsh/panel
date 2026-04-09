import type { ReactNode } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { statusLabel } from '@/lib/server-runtime';
import { cn } from '@/lib/utils';

export function serverStatusDotTone(status: string): string {
    switch (status) {
        case 'running':
            return 'bg-emerald-500 ring-emerald-500/25';
        case 'starting':
        case 'installing':
        case 'stopping':
        case 'restarting':
            return 'bg-amber-500 ring-amber-500/25';
        case 'install_failed':
            return 'bg-[#d92400] ring-[#d92400]/20';
        case 'pending':
            return 'bg-sky-500 ring-sky-500/25';
        default:
            return 'bg-muted-foreground/55 ring-muted-foreground/15';
    }
}

export default function ServerStatusIndicator({
    status,
    className,
    tooltipContent,
}: {
    status: string;
    className?: string;
    tooltipContent?: ReactNode;
}) {
    const label = statusLabel(status);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        'inline-flex h-4 w-4 items-center justify-center rounded-full outline-hidden',
                        className,
                    )}
                    aria-label={`Server status: ${label}`}
                >
                    <span
                        className={cn(
                            'relative flex h-2 w-2 items-center justify-center rounded-full ring-4',
                            serverStatusDotTone(status),
                        )}
                    />
                </button>
            </TooltipTrigger>
            <TooltipContent>{tooltipContent ?? <p>{label}</p>}</TooltipContent>
        </Tooltip>
    );
}
