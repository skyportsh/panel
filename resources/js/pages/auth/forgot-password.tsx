// Components
import { Form, Head } from "@inertiajs/react";
import { useEffect } from "react";
import { toast } from "@/components/ui/sonner";
import TextLink from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import AuthLayout from "@/layouts/auth-layout";
import { login } from "@/routes";
import { email } from "@/routes/password";

export default function ForgotPassword({ status }: { status?: string }) {
    useEffect(() => {
        if (status) {
            toast.success(status);
        }
    }, [status]);

    return (
        <AuthLayout
            title="Forgot password"
            description="Enter your email to receive a password reset link"
        >
            <Head title="Forgot password" />

            <div className="space-y-6">
                <Form
                    {...email.form()}
                    onError={(errors) => {
                        Object.values(errors).forEach((message) =>
                            toast.error(message),
                        );
                    }}
                >
                    {({ processing }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="off"
                                    autoFocus
                                    placeholder="email@example.com"
                                />
                            </div>

                            <div className="my-6 flex items-center justify-start">
                                <Button
                                    className="w-full"
                                    disabled={processing}
                                    data-test="email-password-reset-link-button"
                                >
                                    {processing && <Spinner />}
                                    Email password reset link
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                <div className="space-x-1 text-center text-sm text-muted-foreground">
                    <span>Or, return to</span>
                    <TextLink href={login()}>log in</TextLink>
                </div>
            </div>
        </AuthLayout>
    );
}
