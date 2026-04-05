import { countryFlags } from '@/data/country-flags';
import { cn } from '@/lib/utils';

type CountryFlagIconProps = {
    className?: string;
    countryName: string;
};

export function findCountryFlag(countryName: string) {
    return countryFlags.find((country) => country.name === countryName) ?? null;
}

export function CountryFlagIcon({
    className,
    countryName,
}: CountryFlagIconProps) {
    const country = findCountryFlag(countryName);

    if (!country) {
        return null;
    }

    return (
        <span
            aria-hidden="true"
            className={cn(
                '[&_svg]:block [&_svg]:size-5 [&_svg]:rounded-sm',
                className,
            )}
            dangerouslySetInnerHTML={{ __html: country.svg }}
        />
    );
}

export function CountryFlagOption({
    className,
    countryName,
}: CountryFlagIconProps) {
    return (
        <span className={cn('flex items-center gap-2', className)}>
            <CountryFlagIcon countryName={countryName} />
            <span className="truncate">{countryName}</span>
        </span>
    );
}
