import { Form, Head } from "@inertiajs/react";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "@/components/ui/sonner";
import PasskeyController from "@/actions/App/Http/Controllers/Settings/PasskeyController";
import SecurityController from "@/actions/App/Http/Controllers/Settings/SecurityController";
import Heading from "@/components/heading";
import InputError from "@/components/input-error";
import PasswordInput from "@/components/password-input";
import TwoFactorRecoveryCodes from "@/components/two-factor-recovery-codes";
import TwoFactorSetupModal from "@/components/two-factor-setup-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useTwoFactorAuth } from "@/hooks/use-two-factor-auth";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import { passkeysAreSupported, registerPasskey } from "@/lib/passkeys";
import { edit } from "@/routes/security";
import { disable, enable } from "@/routes/two-factor";
import type { BreadcrumbItem, Passkey } from "@/types";

type Props = {
    canManageTwoFactor?: boolean;
    passkeys: Passkey[];
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Security settings",
        href: edit(),
    },
];

function csrfToken(): string {
    return (
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? ""
    );
}

export default function Security({
    canManageTwoFactor = false,
    passkeys,
    requiresConfirmation = false,
    twoFactorEnabled = false,
}: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const [submitting, setSubmitting] = useState(false);
    const [passkeysList, setPasskeysList] = useState(passkeys);
    const [registeringPasskey, setRegisteringPasskey] = useState(false);
    const [removingPasskeyId, setRemovingPasskeyId] = useState<number | null>(
        null,
    );
    const submitStart = useRef(0);
    const MIN_MS = 600;

    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);

    const handleAddPasskey = async (): Promise<void> => {
        if (!passkeysAreSupported()) {
            toast.error("This browser does not support passkeys.");

            return;
        }

        setRegisteringPasskey(true);

        try {
            await registerPasskey(
                PasskeyController.create.url(),
                PasskeyController.store.url(),
                "Passkey",
            );

            toast.success("Passkey added");
            window.location.reload();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to add passkey.";
            toast.error(message);
        } finally {
            setRegisteringPasskey(false);
        }
    };

    const handleDeletePasskey = async (passkey: Passkey): Promise<void> => {
        setRemovingPasskeyId(passkey.id);

        try {
            const response = await fetch(
                PasskeyController.destroy.url(passkey.id),
                {
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json",
                        "X-CSRF-TOKEN": csrfToken(),
                    },
                    method: "DELETE",
                },
            );

            if (!response.ok) {
                throw new Error("Unable to remove passkey.");
            }

            setPasskeysList((current) =>
                current.filter(({ id }) => id !== passkey.id),
            );
            toast.success("Passkey removed");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Unable to remove passkey.";
            toast.error(message);
        } finally {
            setRemovingPasskeyId(null);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Security settings" />

            <h1 className="sr-only">Security settings</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Passkeys"
                        description="Add a passkey for faster, passwordless sign-in on supported devices"
                    />

                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-4">
                            <div className="space-y-1">
                                <p className="text-sm font-medium">
                                    Saved passkeys
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {passkeysList.length > 0
                                        ? "You will be prompted to use a saved passkey when you visit the login page."
                                        : "No passkeys added yet."}
                                </p>
                            </div>

                            <Button
                                type="button"
                                onClick={handleAddPasskey}
                                disabled={registeringPasskey}
                            >
                                {registeringPasskey && <Spinner />}
                                <KeyRound />
                                Add passkey
                            </Button>
                        </div>

                        {passkeysList.length > 0 && (
                            <div className="space-y-3">
                                {passkeysList.map((passkey) => (
                                    <div
                                        key={passkey.id}
                                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-4"
                                    >
                                        <div className="space-y-1">
                                            <p className="font-medium">
                                                {passkey.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {passkey.last_used_at
                                                    ? `Last used ${new Date(passkey.last_used_at).toLocaleString()}`
                                                    : "Not used yet"}
                                            </p>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                handleDeletePasskey(passkey)
                                            }
                                            disabled={
                                                removingPasskeyId === passkey.id
                                            }
                                        >
                                            {removingPasskeyId ===
                                                passkey.id && <Spinner />}
                                            <Trash2 />
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Heading
                        variant="small"
                        title="Update password"
                        description="Ensure your account is using a long, random password to stay secure"
                    />

                    <Form
                        {...SecurityController.update.form()}
                        options={{ preserveScroll: true }}
                        resetOnError={[
                            "password",
                            "password_confirmation",
                            "current_password",
                        ]}
                        resetOnSuccess
                        onStart={() => {
                            submitStart.current = Date.now();
                            setSubmitting(true);
                        }}
                        onFinish={() => {
                            const remaining =
                                MIN_MS - (Date.now() - submitStart.current);
                            setTimeout(
                                () => setSubmitting(false),
                                Math.max(0, remaining),
                            );
                        }}
                        onSuccess={() => toast.success("Password updated")}
                        onError={(validationErrors) => {
                            if (validationErrors.password) {
                                passwordInput.current?.focus();
                            }

                            if (validationErrors.current_password) {
                                currentPasswordInput.current?.focus();
                            }
                        }}
                        className="space-y-6"
                    >
                        {({ errors: validationErrors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="current_password">
                                        Current password
                                    </Label>

                                    <PasswordInput
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        className="mt-1 block w-full"
                                        autoComplete="current-password"
                                        placeholder="Current password"
                                    />

                                    <InputError
                                        message={
                                            validationErrors.current_password
                                        }
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password">
                                        New password
                                    </Label>

                                    <PasswordInput
                                        id="password"
                                        ref={passwordInput}
                                        name="password"
                                        className="mt-1 block w-full"
                                        autoComplete="new-password"
                                        placeholder="New password"
                                    />

                                    <InputError
                                        message={validationErrors.password}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">
                                        Confirm password
                                    </Label>

                                    <PasswordInput
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        className="mt-1 block w-full"
                                        autoComplete="new-password"
                                        placeholder="Confirm password"
                                    />

                                    <InputError
                                        message={
                                            validationErrors.password_confirmation
                                        }
                                    />
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={submitting}
                                        data-test="update-password-button"
                                    >
                                        {submitting && <Spinner />}
                                        Save password
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>

                {canManageTwoFactor && (
                    <div className="space-y-6">
                        <Heading
                            variant="small"
                            title="Two-factor authentication"
                            description="Manage your two-factor authentication settings"
                        />
                        {twoFactorEnabled ? (
                            <div className="flex flex-col items-start justify-start space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    You will be prompted for a secure, random
                                    pin during login, which you can retrieve
                                    from the TOTP-supported application on your
                                    phone.
                                </p>

                                <div className="relative inline">
                                    <Form {...disable.form()}>
                                        {({ processing }) => (
                                            <Button
                                                variant="destructive"
                                                type="submit"
                                                disabled={processing}
                                            >
                                                Disable 2FA
                                            </Button>
                                        )}
                                    </Form>
                                </div>

                                <TwoFactorRecoveryCodes
                                    recoveryCodesList={recoveryCodesList}
                                    fetchRecoveryCodes={fetchRecoveryCodes}
                                    errors={errors}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-start justify-start space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    When you enable two-factor authentication,
                                    you will be prompted for a secure pin during
                                    login. This pin can be retrieved from a
                                    TOTP-supported application on your phone.
                                </p>

                                <div>
                                    {hasSetupData ? (
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                setShowSetupModal(true)
                                            }
                                        >
                                            <ShieldCheck />
                                            Continue setup
                                        </Button>
                                    ) : (
                                        <Form
                                            {...enable.form()}
                                            onSuccess={() =>
                                                setShowSetupModal(true)
                                            }
                                        >
                                            {({ processing }) => (
                                                <Button
                                                    type="submit"
                                                    disabled={processing}
                                                >
                                                    Enable 2FA
                                                </Button>
                                            )}
                                        </Form>
                                    )}
                                </div>
                            </div>
                        )}

                        <TwoFactorSetupModal
                            isOpen={showSetupModal}
                            onClose={() => setShowSetupModal(false)}
                            requiresConfirmation={requiresConfirmation}
                            twoFactorEnabled={twoFactorEnabled}
                            qrCodeSvg={qrCodeSvg}
                            manualSetupKey={manualSetupKey}
                            clearSetupData={clearSetupData}
                            fetchSetupData={fetchSetupData}
                            errors={errors}
                        />
                    </div>
                )}
            </SettingsLayout>
        </AppLayout>
    );
}
