import { Head, useForm } from '@inertiajs/react';
import { useRef, useState } from 'react';
import {
    index as adminSettings,
    update,
} from '@/actions/App/Http/Controllers/Admin/SettingsController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/sonner';
import AdminLayout from '@/layouts/admin/layout';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Props = {
    settings: {
        app_name: string;
    };
};

type SettingsFormData = {
    app_name: string;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: adminSettings.url() },
    { title: 'Settings', href: adminSettings.url() },
];

export default function Settings({ settings }: Props) {
    const form = useForm<SettingsFormData>({
        app_name: settings.app_name,
    });
    const minimumMs = 500;
    const submitStart = useRef(0);
    const [submitting, setSubmitting] = useState(false);

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        form.patch(update.url(), {
            preserveScroll: true,
            onStart: () => {
                submitStart.current = Date.now();
                setSubmitting(true);
            },
            onFinish: () => {
                const remaining =
                    minimumMs - (Date.now() - submitStart.current);
                setTimeout(() => setSubmitting(false), Math.max(0, remaining));
            },
            onSuccess: () => {
                form.setDefaults('app_name', form.data.app_name);
                toast.success('Settings updated');
            },
            onError: (errors) => {
                Object.values(errors).forEach((message) => {
                    toast.error(message);
                });
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin — Settings" />

            <AdminLayout
                title="Settings"
                description="Manage panel-wide branding and future appearance options."
            >
                <form onSubmit={submit} className="max-w-xl space-y-4">
                    <div className="grid gap-2">
                        <Label htmlFor="app-name">Application name</Label>
                        <Input
                            id="app-name"
                            value={form.data.app_name}
                            onChange={(event) =>
                                form.setData('app_name', event.target.value)
                            }
                            placeholder="Skyport"
                            required
                        />
                        <InputError message={form.errors.app_name} />
                    </div>

                    <div className="flex justify-start">
                        <Button
                            type="submit"
                            disabled={
                                submitting || form.processing || !form.isDirty
                            }
                        >
                            {(submitting || form.processing) && <Spinner />}
                            Save changes
                        </Button>
                    </div>
                </form>
            </AdminLayout>
        </AppLayout>
    );
}
