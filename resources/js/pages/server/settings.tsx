import { Head, useForm } from '@inertiajs/react';
import {
    show,
    updateGeneral,
    updateStartup,
} from '@/actions/App/Http/Controllers/Client/ServerSettingsController';
import InputError from '@/components/input-error';
import Heading from '@/components/heading';
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
import { toast } from '@/components/ui/sonner';
import AppLayout from '@/layouts/app-layout';
import { home } from '@/routes';
import { console as serverConsole } from '@/routes/client/servers';
import type { BreadcrumbItem } from '@/types';
import { useMemo, useRef, useState } from 'react';

type DockerImageOption = {
    image: string;
    label: string;
};

type Props = {
    server: {
        cargo: {
            docker_images: DockerImageOption[];
            id: number;
            name: string;
        };
        docker_image: string | null;
        startup_command: string;
        startup_command_override: string | null;
        docker_image_override: string | null;
        effective_docker_image: string | null;
        effective_docker_image_label: string | null;
        id: number;
        name: string;
        status: string;
    };
};

type GeneralFormData = {
    name: string;
};

type StartupFormData = {
    docker_image: string;
};

const pageTabs: Tab[] = [
    { id: 'general', label: 'General' },
    { id: 'startup', label: 'Startup' },
];

function SettingsPanel({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-md bg-sidebar p-1">
            <div className="rounded-md border border-sidebar-accent bg-background p-6">
                {children}
            </div>
        </div>
    );
}

export default function ServerSettings({ server }: Props) {
    const [tab, setTab] = useState<Tab['id']>('general');
    const minimumMs = 500;
    const generalSubmitStart = useRef(0);
    const startupSubmitStart = useRef(0);
    const [savingGeneral, setSavingGeneral] = useState(false);
    const [savingStartup, setSavingStartup] = useState(false);
    const generalForm = useForm<GeneralFormData>({
        name: server.name,
    });
    const startupForm = useForm<StartupFormData>({
        docker_image:
            server.docker_image ?? server.effective_docker_image ?? '',
    });
    const dockerImageOptions = server.cargo.docker_images;
    const selectedDockerImage = useMemo(
        () =>
            dockerImageOptions.find(
                (option) => option.image === startupForm.data.docker_image,
            ) ?? null,
        [dockerImageOptions, startupForm.data.docker_image],
    );
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Home',
            href: home(),
        },
        {
            title: server.name,
            href: serverConsole(server.id),
        },
        {
            title: 'Settings',
            href: show(server.id),
        },
    ];
    const startupDescription =
        server.status === 'offline' ||
        server.status === 'install_failed' ||
        server.status === 'pending'
            ? 'Choose which Docker image should be used the next time this server starts.'
            : 'Choose which Docker image should be used the next time this server restarts.';

    const submitGeneral = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        generalForm.patch(updateGeneral.url(server.id), {
            preserveScroll: true,
            onStart: () => {
                generalSubmitStart.current = Date.now();
                setSavingGeneral(true);
            },
            onFinish: () => {
                const remaining =
                    minimumMs - (Date.now() - generalSubmitStart.current);
                setTimeout(
                    () => setSavingGeneral(false),
                    Math.max(0, remaining),
                );
            },
            onSuccess: () => {
                generalForm.setDefaults();
                toast.success('Server settings updated');
            },
            onError: (errors) => {
                Object.values(errors).forEach((message) => {
                    toast.error(message);
                });
            },
        });
    };

    const submitStartup = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        startupForm.patch(updateStartup.url(server.id), {
            preserveScroll: true,
            onStart: () => {
                startupSubmitStart.current = Date.now();
                setSavingStartup(true);
            },
            onFinish: () => {
                const remaining =
                    minimumMs - (Date.now() - startupSubmitStart.current);
                setTimeout(
                    () => setSavingStartup(false),
                    Math.max(0, remaining),
                );
            },
            onSuccess: () => {
                startupForm.setDefaults();
                toast.success('Startup settings updated');
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
            <Head title={`${server.name} — Settings`} />

            <div className="px-4 py-6">
                <Heading
                    title="Settings"
                    description="Manage this server's general details and runtime startup configuration."
                />

                <div className="space-y-6">
                    <SlidingTabs
                        tabs={pageTabs}
                        active={tab}
                        onChange={setTab}
                    />

                    {tab === 'general' ? (
                        <form onSubmit={submitGeneral}>
                            <SettingsPanel>
                                <Heading
                                    variant="small"
                                    title="General"
                                    description="Change your server's name."
                                />

                                <div className="mt-6 max-w-xl space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="server-name">
                                            Server name
                                        </Label>
                                        <Input
                                            id="server-name"
                                            value={generalForm.data.name}
                                            onChange={(event) =>
                                                generalForm.setData(
                                                    'name',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Alpha"
                                            required
                                        />
                                        <InputError
                                            message={generalForm.errors.name}
                                        />
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Button
                                            type="submit"
                                            disabled={
                                                savingGeneral ||
                                                generalForm.processing ||
                                                !generalForm.isDirty
                                            }
                                        >
                                            {(savingGeneral ||
                                                generalForm.processing) && (
                                                <Spinner />
                                            )}
                                            Save general settings
                                        </Button>
                                    </div>
                                </div>
                            </SettingsPanel>
                        </form>
                    ) : null}

                    {tab === 'startup' ? (
                        <form onSubmit={submitStartup}>
                            <SettingsPanel>
                                <Heading
                                    variant="small"
                                    title="Startup"
                                    description={startupDescription}
                                />

                                <div className="mt-6 max-w-2xl space-y-4">
                                    <div className="grid gap-2">
                                        <Label>Startup command</Label>
                                        <code className="rounded-md border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                            {server.startup_command}
                                        </code>
                                        {server.startup_command_override && (
                                            <p className="text-xs text-amber-500">
                                                This command was manually set by an administrator.
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="docker-image">
                                            Docker image
                                        </Label>
                                        {server.docker_image_override && (
                                            <p className="text-xs text-amber-500">
                                                The Docker image has been locked by an administrator to:{' '}
                                                <code className="font-medium">{server.docker_image_override}</code>
                                            </p>
                                        )}
                                        <Select
                                            disabled={!!server.docker_image_override}
                                            value={
                                                startupForm.data.docker_image
                                            }
                                            onValueChange={(value) =>
                                                startupForm.setData(
                                                    'docker_image',
                                                    value,
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                id="docker-image"
                                                className="min-h-16 w-full py-3"
                                            >
                                                {selectedDockerImage ? (
                                                    <span className="flex min-w-0 flex-col items-start text-left">
                                                        <span className="font-medium text-foreground">
                                                            {
                                                                selectedDockerImage.label
                                                            }
                                                        </span>
                                                        <span className="break-all font-mono text-xs text-muted-foreground">
                                                            {
                                                                selectedDockerImage.image
                                                            }
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <SelectValue placeholder="Choose a Docker image" />
                                                )}
                                            </SelectTrigger>
                                            <SelectContent>
                                                {dockerImageOptions.map(
                                                    (option) => (
                                                        <SelectItem
                                                            key={option.image}
                                                            value={option.image}
                                                        >
                                                            <span className="flex min-w-0 flex-col items-start gap-0.5">
                                                                <span className="font-medium text-foreground">
                                                                    {
                                                                        option.label
                                                                    }
                                                                </span>
                                                                <span className="break-all font-mono text-xs text-muted-foreground">
                                                                    {
                                                                        option.image
                                                                    }
                                                                </span>
                                                            </span>
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={
                                                startupForm.errors.docker_image
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <Button
                                            type="submit"
                                            disabled={
                                                savingStartup ||
                                                startupForm.processing ||
                                                !startupForm.isDirty
                                            }
                                        >
                                            {(savingStartup ||
                                                startupForm.processing) && (
                                                <Spinner />
                                            )}
                                            Save startup settings
                                        </Button>
                                    </div>
                                </div>
                            </SettingsPanel>
                        </form>
                    ) : null}
                </div>
            </div>
        </AppLayout>
    );
}
