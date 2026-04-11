import { Form, Head } from '@inertiajs/react';

import { toast } from '@/components/ui/sonner';
import Heading from '@/components/heading';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { store } from '@/routes/password/confirm';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Confirm password',
        href: '/user/confirm-password',
    },
];

export default function ConfirmPassword() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Confirm password" />

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Confirm your password"
                        description="This is a secure area. Please confirm your password before continuing."
                    />

                    <Form
                        {...store()}
                        resetOnSuccess={['password']}
                        onError={(errors) => {
                            Object.values(errors).forEach((message) => {
                                toast.error(message);
                            });
                        }}
                    >
                        {({ processing }) => (
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <PasswordInput
                                        id="password"
                                        name="password"
                                        placeholder="Password"
                                        autoComplete="current-password"
                                        autoFocus
                                    />
                                </div>

                                <Button
                                    disabled={processing}
                                    data-test="confirm-password-button"
                                >
                                    {processing && <Spinner />}
                                    Confirm password
                                </Button>
                            </div>
                        )}
                    </Form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
