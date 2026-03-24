import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import type { User } from '@/types';

const currencyLocaleMap: Record<string, string> = {
    AUD: 'en-AU',
    CAD: 'en-CA',
    EUR: 'en-IE',
    GBP: 'en-GB',
    JPY: 'ja-JP',
    USD: 'en-US',
};

function formatBalance(user: User): string {
    const locale = currencyLocaleMap[user.preferred_currency] ?? 'en-GB';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: user.preferred_currency,
    }).format(user.credit_balance / 100);
}

export function UserInfo({
    user,
    showEmail = false,
    showBalances = false,
}: {
    user: User;
    showEmail?: boolean;
    showBalances?: boolean;
}) {
    const getInitials = useInitials();

    return (
        <>
            <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                {showBalances && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-sidebar-foreground/80 transition-colors group-hover:text-sidebar-accent-foreground group-data-[state=open]:text-sidebar-accent-foreground">
                        <span className="truncate">
                            {user.coins_balance.toLocaleString()} credits
                        </span>
                        <span
                            aria-hidden="true"
                            className="h-3 w-px shrink-0 rounded-full bg-white/15 transition-colors"
                        />
                        <span className="truncate">
                            {formatBalance(user)} {user.preferred_currency}
                        </span>
                    </div>
                )}
                {showEmail && (
                    <span className="truncate text-xs text-muted-foreground">
                        {user.email}
                    </span>
                )}
            </div>
        </>
    );
}
