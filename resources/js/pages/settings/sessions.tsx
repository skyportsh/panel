import { Head, router } from '@inertiajs/react';
import { Monitor, Smartphone, Tablet } from 'lucide-react';
import { useState } from 'react';
import {
    destroy,
    edit as editSessions,
} from '@/actions/App/Http/Controllers/Settings/SessionsController';
import Heading from '@/components/heading';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/sonner';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import type { BreadcrumbItem } from '@/types';

type Session = {
    id: string;
    ip_address: string | null;
    user_agent: string | null;
    last_activity: string;
    is_current: boolean;
};

type Props = {
    sessions: Session[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sessions',
        href: editSessions.url(),
    },
];

function deviceIcon(userAgent: string | null) {
    const agent = userAgent?.toLowerCase() ?? '';

    if (
        agent.includes('iphone') ||
        agent.includes('android') ||
        agent.includes('mobile')
    ) {
        return <Smartphone className="h-5 w-5 text-muted-foreground" />;
    }

    if (agent.includes('ipad') || agent.includes('tablet')) {
        return <Tablet className="h-5 w-5 text-muted-foreground" />;
    }

    return <Monitor className="h-5 w-5 text-muted-foreground" />;
}

function browserName(userAgent: string | null): string {
    const agent = userAgent?.toLowerCase() ?? '';

    if (agent.includes('firefox')) {
        return 'Firefox';
    }

    if (agent.includes('edg')) {
        return 'Edge';
    }

    if (agent.includes('chrome')) {
        return 'Chrome';
    }

    if (agent.includes('safari')) {
        return 'Safari';
    }

    return 'Unknown browser';
}

function osName(userAgent: string | null): string {
    const agent = userAgent?.toLowerCase() ?? '';

    if (agent.includes('windows')) {
        return 'Windows';
    }

    if (agent.includes('mac os')) {
        return 'macOS';
    }

    if (agent.includes('linux')) {
        return 'Linux';
    }

    if (agent.includes('android')) {
        return 'Android';
    }

    if (agent.includes('iphone') || agent.includes('ipad')) {
        return 'iOS';
    }

    return 'Unknown OS';
}

export default function Sessions({ sessions }: Props) {
    const [revoking, setRevoking] = useState<string | null>(null);
    const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

    const handleRevoke = (sessionId: string) => {
        setRevoking(sessionId);
        router.delete(destroy.url(sessionId), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Session revoked');
                setConfirmRevoke(null);
            },
            onError: (errors) => {
                Object.values(errors).forEach((m) => toast.error(m));
            },
            onFinish: () => setRevoking(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sessions" />

            <h1 className="sr-only">Sessions</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Active sessions"
                        description="Manage your active sessions across devices. Revoke any session you don't recognize."
                    />

                    <div className="space-y-3">
                        {sessions.map((session) => (
                            <div
                                key={session.id}
                                className="flex items-center gap-4 rounded-lg border border-border/70 bg-background px-4 py-3"
                            >
                                {deviceIcon(session.user_agent)}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground">
                                        {browserName(session.user_agent)} on{' '}
                                        {osName(session.user_agent)}
                                        {session.is_current && (
                                            <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                This device
                                            </span>
                                        )}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {session.ip_address ?? 'Unknown IP'}{' '}
                                        &middot; {session.last_activity}
                                    </p>
                                </div>
                                {!session.is_current && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() =>
                                            setConfirmRevoke(session.id)
                                        }
                                    >
                                        Revoke
                                    </Button>
                                )}
                            </div>
                        ))}

                        {sessions.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No active sessions found.
                            </p>
                        )}
                    </div>
                </div>

                <AlertDialog
                    open={confirmRevoke !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setConfirmRevoke(null);
                        }
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Revoke this session?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This will log out the device associated with
                                this session. They will need to sign in again.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={revoking !== null}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-white hover:bg-destructive/90"
                                disabled={revoking !== null}
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (confirmRevoke) {
                                        handleRevoke(confirmRevoke);
                                    }
                                }}
                            >
                                {revoking !== null && <Spinner />}
                                Revoke session
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </SettingsLayout>
        </AppLayout>
    );
}
