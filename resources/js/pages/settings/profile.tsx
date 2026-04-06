import { Form, Head, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import ProfileController from "@/actions/App/Http/Controllers/Settings/ProfileController";
import DeleteUser from "@/components/delete-user";
import Heading from "@/components/heading";
import InputError from "@/components/input-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import { edit } from "@/routes/profile";
import type { BreadcrumbItem } from "@/types";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Profile settings",
        href: edit(),
    },
];

export default function Profile({ status }: { status?: string }) {
    const { auth } = usePage().props;
    const [submitting, setSubmitting] = useState(false);
    const submitStart = useRef(0);
    const MIN_MS = 600;

    useEffect(() => {
        if (status === "verification-link-sent") {
            toast.success("Verification link sent to your email address.");
        }
    }, [status]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <h1 className="sr-only">Profile settings</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Profile information"
                        description="Update your name and email address"
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
                        onSuccess={() => toast.success("Profile saved")}
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
