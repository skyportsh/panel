import { Form, Head } from "@inertiajs/react";
import { KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import PasskeyAuthenticationController from "@/actions/App/Http/Controllers/Auth/PasskeyAuthenticationController";
import PasswordInput from "@/components/password-input";
import TextLink from "@/components/text-link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import AuthLayout from "@/layouts/auth-layout";
import {
    authenticateWithPasskey,
    conditionalMediationAvailable,
    passkeyAutocomplete,
    passkeysAreSupported,
} from "@/lib/passkeys";
import { register } from "@/routes";
import { store } from "@/routes/login";
import { request } from "@/routes/password";

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
    canUsePasskeys: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
    canUsePasskeys,
}: Props) {
    const [passkeyProcessing, setPasskeyProcessing] = useState(false);
    const abortController = useRef<AbortController | null>(null);

    useEffect(() => {
        if (status) {
            toast.success(status);
        }
    }, [status]);

    useEffect(() => {
        if (!canUsePasskeys || !passkeysAreSupported()) {
            return;
        }

        let active = true;

        void (async () => {
            if (!(await conditionalMediationAvailable())) {
                return;
            }

            abortController.current = new AbortController();

            try {
                const redirect = await authenticateWithPasskey(
                    PasskeyAuthenticationController.create.url(),
                    PasskeyAuthenticationController.store.url(),
                    false,
                    true,
                    abortController.current.signal,
                );

                if (active && redirect) {
                    window.location.assign(redirect);
                }
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    (error.name === "AbortError" ||
                        error.name === "NotAllowedError")
                ) {
                    return;
                }
            }
        })();

        return () => {
            active = false;
            abortController.current?.abort();
        };
    }, [canUsePasskeys]);

    const handlePasskeyLogin = async (): Promise<void> => {
        if (!canUsePasskeys || !passkeysAreSupported()) {
            toast.error("This browser does not support passkeys.");

            return;
        }

        abortController.current?.abort();
        setPasskeyProcessing(true);

        try {
            const redirect = await authenticateWithPasskey(
                PasskeyAuthenticationController.create.url(),
                PasskeyAuthenticationController.store.url(),
                false,
                false,
            );

            if (redirect) {
                window.location.assign(redirect);
            }
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to sign in with a passkey.";
            toast.error(message);
        } finally {
            setPasskeyProcessing(false);
        }
    };

    return (
        <AuthLayout
            title="Log in to your account"
            description="Enter your email and password below to log in, or use a saved passkey"
        >
            <Head title="Log in" />

            <Form
                {...store.form()}
                resetOnSuccess={["password"]}
                onStart={() => {
                    abortController.current?.abort();
                }}
                onError={(errors) => {
                    Object.values(errors).forEach((message) =>
                        toast.error(message),
                    );
                }}
                className="flex flex-col gap-6"
            >
                {({ processing }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete={passkeyAutocomplete()}
                                    placeholder="email@example.com"
                                />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm"
                                            tabIndex={5}
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Password"
                                />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember">Remember me</Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Log in
                            </Button>

                            {canUsePasskeys && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={handlePasskeyLogin}
                                    disabled={processing || passkeyProcessing}
                                >
                                    {passkeyProcessing && <Spinner />}
                                    <KeyRound />
                                    Use a passkey
                                </Button>
                            )}
                        </div>

                        {canRegister && (
                            <div className="text-center text-sm text-muted-foreground">
                                Don't have an account?{" "}
                                <TextLink href={register()} tabIndex={5}>
                                    Sign up
                                </TextLink>
                            </div>
                        )}
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}
