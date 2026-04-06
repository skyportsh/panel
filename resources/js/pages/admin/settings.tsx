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
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import AdminLayout from '@/layouts/admin/layout';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Props = {
    settings: {
        app_name: string;
        announcement: string;
        announcement_enabled: boolean;
    };
};

type SettingsFormData = {
    app_name: string;
    announcement: string;
    announcement_enabled: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: adminSettings.url() },
    { title: 'Settings', href: adminSettings.url() },
];

export default function Settings({ settings }: Props) {
    const form = useForm<SettingsFormData>({
        app_name: settings.app_name,
        announcement: settings.announcement,
        announcement_enabled: settings.announcement_enabled,
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
                form.setDefaults();
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
                description="Manage panel-wide branding and announcements."
            >
                <form onSubmit={submit} className="max-w-xl space-y-6">
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

                    <div className="space-y-4 rounded-lg border border-border/70 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="announcement-toggle">
                                    Announcement banner
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Show a banner to all users across the
                                    panel.
                                </p>
                            </div>
                            <Switch
                                id="announcement-toggle"
                                checked={form.data.announcement_enabled}
                                onCheckedChange={(checked) =>
                                    form.setData(
                                        'announcement_enabled',
                                        checked,
                                    )
                                }
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="announcement">
                                Announcement message
                            </Label>
                            <textarea
                                id="announcement"
                                value={form.data.announcement}
                                onChange={(event) =>
                                    form.setData(
                                        'announcement',
                                        event.target.value,
                                    )
                                }
                                placeholder="Scheduled maintenance on Friday at 10pm UTC..."
                                rows={3}
                                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                maxLength={1000}
                            />
                            <InputError message={form.errors.announcement} />
                        </div>
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
