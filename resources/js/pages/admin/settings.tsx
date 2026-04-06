import { Head, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle,
    Info,
    Megaphone,
    ShieldAlert,
    X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
    index as adminSettings,
    update,
} from '@/actions/App/Http/Controllers/Admin/SettingsController';
import {
    typeConfig,
    type AnnouncementType,
} from '@/components/announcement-banner';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
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
import { SlidingTabs } from '@/components/ui/sliding-tabs';
import type { Tab } from '@/components/ui/sliding-tabs';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import AdminLayout from '@/layouts/admin/layout';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Props = {
    settings: {
        app_name: string;
        announcement: string;
        announcement_enabled: boolean;
        announcement_type: string;
        announcement_dismissable: boolean;
    };
};

type SettingsFormData = {
    app_name: string;
    announcement: string;
    announcement_enabled: boolean;
    announcement_type: string;
    announcement_dismissable: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: adminSettings.url() },
    { title: 'Settings', href: adminSettings.url() },
];

const pageTabs: Tab[] = [
    { id: 'general', label: 'General' },
    { id: 'announcement', label: 'Announcement' },
];

const typeIcons: Record<string, typeof Info> = {
    success: CheckCircle,
    warning: AlertTriangle,
    alert: ShieldAlert,
    update: Megaphone,
    information: Info,
};

function AnnouncementPreview({
    type,
    message,
    dismissable,
}: {
    type: AnnouncementType;
    message: string;
    dismissable: boolean;
}) {
    const config = typeConfig[type];
    const Icon = config.icon;

    if (!message) {
        return (
            <div className="rounded-xl border border-dashed border-sidebar-border/70 px-4 py-6 text-center text-xs text-muted-foreground dark:border-sidebar-border">
                Enter a message to see a preview
            </div>
        );
    }

    return (
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
                <span className="flex-1 text-sm font-medium">{message}</span>
                {dismissable && (
                    <span className="shrink-0 rounded-md p-0.5 opacity-60">
                        <X className="h-3.5 w-3.5" />
                    </span>
                )}
            </div>
        </div>
    );
}

export default function Settings({ settings }: Props) {
    const [tab, setTab] = useState('general');
    const form = useForm<SettingsFormData>({
        app_name: settings.app_name,
        announcement: settings.announcement,
        announcement_enabled: settings.announcement_enabled,
        announcement_type: settings.announcement_type,
        announcement_dismissable: settings.announcement_dismissable,
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
                <div className="space-y-6">
                    <SlidingTabs
                        tabs={pageTabs}
                        active={tab}
                        onChange={setTab}
                    />

                    <form onSubmit={submit}>
                        {tab === 'general' && (
                            <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                                <div className="p-2">
                                    <div className="rounded-md bg-sidebar p-1">
                                        <div className="rounded-md border border-sidebar-accent bg-background p-6">
                                            <Heading
                                                variant="small"
                                                title="Branding"
                                                description="Configure how the panel appears to users."
                                            />

                                            <div className="mt-6 max-w-md space-y-4">
                                                <div className="grid gap-2">
                                                    <Label htmlFor="app-name">
                                                        Application name
                                                    </Label>
                                                    <Input
                                                        id="app-name"
                                                        value={
                                                            form.data.app_name
                                                        }
                                                        onChange={(e) =>
                                                            form.setData(
                                                                'app_name',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="Skyport"
                                                        required
                                                    />
                                                    <InputError
                                                        message={
                                                            form.errors.app_name
                                                        }
                                                    />
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <Button
                                                        type="submit"
                                                        disabled={
                                                            submitting ||
                                                            form.processing ||
                                                            !form.isDirty
                                                        }
                                                    >
                                                        {(submitting ||
                                                            form.processing) && (
                                                            <Spinner />
                                                        )}
                                                        Save
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {tab === 'announcement' && (
                            <div className="space-y-4">
                                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                                    <div className="p-2">
                                        <div className="rounded-md bg-sidebar p-1">
                                            <div className="rounded-md border border-sidebar-accent bg-background p-6">
                                    <div className="flex items-center justify-between">
                                        <Heading
                                            variant="small"
                                            title="Announcement"
                                            description="Show a banner to all users across the panel."
                                        />
                                        <Switch
                                            checked={
                                                form.data.announcement_enabled
                                            }
                                            onCheckedChange={(checked) =>
                                                form.setData(
                                                    'announcement_enabled',
                                                    checked,
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="mt-6 space-y-4">
                                        <div className="grid gap-2">
                                            <Label>Type</Label>
                                            <Select
                                                value={
                                                    form.data.announcement_type
                                                }
                                                onValueChange={(value) =>
                                                    form.setData(
                                                        'announcement_type',
                                                        value,
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(
                                                        typeIcons,
                                                    ).map(([key, Icon]) => (
                                                        <SelectItem
                                                            key={key}
                                                            value={key}
                                                        >
                                                            <span className="flex items-center gap-2">
                                                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                                                                {key
                                                                    .charAt(0)
                                                                    .toUpperCase() +
                                                                    key.slice(
                                                                        1,
                                                                    )}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-2">
                                            <Label htmlFor="announcement">
                                                Message
                                            </Label>
                                            <textarea
                                                id="announcement"
                                                value={form.data.announcement}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'announcement',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Scheduled maintenance on Friday at 10pm UTC..."
                                                rows={3}
                                                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                                maxLength={1000}
                                            />
                                            <InputError
                                                message={
                                                    form.errors.announcement
                                                }
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div>
                                                <Label>Dismissable</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Allow users to hide the
                                                    announcement.
                                                </p>
                                            </div>
                                            <Switch
                                                checked={
                                                    form.data
                                                        .announcement_dismissable
                                                }
                                                onCheckedChange={(checked) =>
                                                    form.setData(
                                                        'announcement_dismissable',
                                                        checked,
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-background dark:border-sidebar-border">
                                    <div className="p-2">
                                        <div className="rounded-md bg-sidebar p-1">
                                            <div className="rounded-md border border-sidebar-accent bg-background p-6">
                                    <span className="text-xs font-medium text-muted-foreground">
                                        Preview
                                    </span>
                                    <div className="mt-3">
                                        <AnnouncementPreview
                                            type={
                                                form.data
                                                    .announcement_type as AnnouncementType
                                            }
                                            message={form.data.announcement}
                                            dismissable={
                                                form.data
                                                    .announcement_dismissable
                                            }
                                        />
                                    </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button
                                        type="submit"
                                        disabled={
                                            submitting ||
                                            form.processing ||
                                            !form.isDirty
                                        }
                                    >
                                        {(submitting || form.processing) && (
                                            <Spinner />
                                        )}
                                        Save
                                    </Button>
                                </div>
                            </div>
                        )}
                    </form>
                </div>
            </AdminLayout>
        </AppLayout>
    );
}
