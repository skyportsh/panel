import { Form, Head, Link, usePage } from '@inertiajs/react';
import { startTransition, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: edit(),
    },
];

export default function Profile({
    countries,
    mustVerifyEmail,
    suggestedAccountRegion,
    status,
}: {
    countries: Array<{ code: string; iconSvg: string; name: string }>;
    mustVerifyEmail: boolean;
    suggestedAccountRegion: string | null;
    status?: string;
}) {
    const { auth } = usePage().props;
    const [submitting, setSubmitting] = useState(false);
    const submitStart = useRef(0);
    const MIN_MS = 600;

    const [selectedRegionCode, setSelectedRegionCode] = useState(
        auth.user.account_region ?? suggestedAccountRegion ?? '',
    );
    const selectedRegion = countries.find(
        (country) => country.code === selectedRegionCode,
    );

    useEffect(() => {
        if (status === 'verification-link-sent') {
            toast.success('Verification link sent to your email address.');
        }
    }, [status]);

    useEffect(() => {
        if (selectedRegionCode !== '') {
            return;
        }

        let isCancelled = false;

        fetch('https://ipapi.co/json/')
            .then((response) => response.json())
            .then((payload: { country_code?: string }) => {
                if (isCancelled || !payload.country_code) {
                    return;
                }

                const countryCode = payload.country_code.toUpperCase();

                if (
                    !countries.some((country) => country.code === countryCode)
                ) {
                    return;
                }

                startTransition(() => {
                    setSelectedRegionCode(countryCode);
                });
            })
            .catch(() => {
                //
            });

        return () => {
            isCancelled = true;
        };
    }, [countries, selectedRegionCode]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Profile information"
                        description="Update your name, email address, and account region"
                    />

                    <Form
                        {...ProfileController.update.form()}
                        options={{ preserveScroll: true }}
                        onStart={() => {
                            submitStart.current = Date.now();
                            setSubmitting(true);
                        }}
                        onFinish={() => {
                            const rem =
                                MIN_MS - (Date.now() - submitStart.current);
                            setTimeout(
                                () => setSubmitting(false),
                                Math.max(0, rem),
                            );
                        }}
                        onSuccess={() => toast.success('Profile saved')}
                        className="space-y-6"
                    >
                        {({ errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>

                                    <Input
                                        id="name"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Full name"
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.name}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email address</Label>

                                    <Input
                                        id="email"
                                        type="email"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="Email address"
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.email}
                                    />
                                </div>

                                <div className="grid gap-3">
                                    <Label htmlFor="account_region">
                                        Account region
                                    </Label>

                                    <Select
                                        name="account_region"
                                        value={selectedRegionCode}
                                        onValueChange={(value) => {
                                            startTransition(() => {
                                                setSelectedRegionCode(value);
                                            });
                                        }}
                                    >
                                        <SelectTrigger
                                            id="account_region"
                                            size="default"
                                            className="w-full cursor-pointer bg-transparent dark:bg-transparent [&>svg]:hidden"
                                        >
                                            {selectedRegion ? (
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <span
                                                        className="[&_svg]:block [&_svg]:size-5 [&_svg]:rounded-sm"
                                                        dangerouslySetInnerHTML={{
                                                            __html: selectedRegion.iconSvg,
                                                        }}
                                                    />
                                                    <span className="truncate">
                                                        {selectedRegion.name}
                                                    </span>
                                                </span>
                                            ) : (
                                                <SelectValue placeholder="Select a country or region" />
                                            )}
                                        </SelectTrigger>
                                        <SelectContent
                                            className="max-h-80"
                                            align="start"
                                        >
                                            {countries.map((country) => (
                                                <SelectItem
                                                    key={country.code}
                                                    value={country.code}
                                                    className="cursor-pointer"
                                                >
                                                    <span
                                                        className="[&_svg]:block [&_svg]:size-5 [&_svg]:rounded-sm"
                                                        dangerouslySetInnerHTML={{
                                                            __html: country.iconSvg,
                                                        }}
                                                    />
                                                    <span>{country.name}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <InputError
                                        className="mt-1"
                                        message={errors.account_region}
                                    />
                                </div>

                                {mustVerifyEmail &&
                                    auth.user.email_verified_at === null && (
                                        <div>
                                            <p className="-mt-4 text-sm text-muted-foreground">
                                                Your email address is
                                                unverified.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                                >
                                                    Click here to resend the
                                                    verification email.
                                                </Link>
                                            </p>
                                        </div>
                                    )}

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={submitting}
                                        data-test="update-profile-button"
                                    >
                                        {submitting && <Spinner />}
                                        Save
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
