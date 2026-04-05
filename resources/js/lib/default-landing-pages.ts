export type LandingOption = {
    label: string;
    group: string;
    url: string;
};

export const DEFAULT_LANDING_URL = '/home';

const baseLandingOptions: LandingOption[] = [
    { group: 'General', label: 'Home', url: DEFAULT_LANDING_URL },
];

const adminLandingOptions: LandingOption[] = [
    { group: 'Admin', label: 'Users', url: '/admin/users' },
];

export function getLandingOptions(isAdmin: boolean): LandingOption[] {
    return isAdmin
        ? [...baseLandingOptions, ...adminLandingOptions]
        : baseLandingOptions;
}

export function resolveLandingUrl(
    preferredUrl: string | null,
    isAdmin: boolean,
): string {
    const validUrls = new Set(
        getLandingOptions(isAdmin).map((item) => item.url),
    );

    if (preferredUrl && validUrls.has(preferredUrl)) {
        return preferredUrl;
    }

    return DEFAULT_LANDING_URL;
}
