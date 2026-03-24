import { Form, Head } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import BillingController from '@/actions/App/Http/Controllers/Settings/BillingController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit as editBilling } from '@/routes/billing';
import type { BreadcrumbItem } from '@/types';

type CurrencyOption = {
    code: string;
    name: string;
    symbol: string;
};

type Props = {
    billing: {
        preferredCurrency: string;
    };
    currencies: CurrencyOption[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Billing settings',
        href: editBilling(),
    },
];

export default function Billing({ billing, currencies }: Props) {
    const [submitting, setSubmitting] = useState(false);
    const submitStart = useRef(0);
    const MIN_MS = 600;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Billing settings" />

            <h1 className="sr-only">Billing settings</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Billing preferences"
                        description="Manage your preferred billing currency"
                    />

                    <Form
                        {...BillingController.update.form()}
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
                        onSuccess={() =>
                            toast.success('Billing settings saved')
                        }
                        className="space-y-6"
                    >
                        {({ errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="preferred_currency">
                                        Preferred currency
                                    </Label>

                                    <select
                                        id="preferred_currency"
                                        name="preferred_currency"
                                        defaultValue={billing.preferredCurrency}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-[color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        {currencies.map((currency) => (
                                            <option
                                                key={currency.code}
                                                value={currency.code}
                                            >
                                                {currency.code} ·{' '}
                                                {currency.name}
                                            </option>
                                        ))}
                                    </select>

                                    <InputError
                                        className="mt-2"
                                        message={errors.preferred_currency}
                                    />
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={submitting}
                                        data-test="update-billing-button"
                                    >
                                        {submitting && <Spinner />}
                                        Save billing settings
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
