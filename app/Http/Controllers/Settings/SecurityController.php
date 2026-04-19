<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Http\Requests\Settings\TwoFactorAuthenticationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class SecurityController extends Controller implements HasMiddleware
{
    /**
     * Get the middleware that should be assigned to the controller.
     */
    public static function middleware(): array
    {
        // Password confirmation is intentionally not applied to the edit
        // (view) action. Viewing security settings is not destructive, and
        // applying the password.confirm middleware to a GET route causes
        // 405 errors on mobile browsers when Fortify redirects back after
        // confirmation. The actual destructive 2FA operations (enable,
        // disable, confirm) go through separate Fortify routes that handle
        // their own confirmation flow.
        return [];
    }

    /**
     * Show the user's security settings page.
     */
    public function edit(TwoFactorAuthenticationRequest $request): Response
    {
        $props = [
            'canManageTwoFactor' => Features::canManageTwoFactorAuthentication(),
            'passkeys' => $request
                ->user()
                ->passkeys()
                ->latest()
                ->get()
                ->map(
                    fn ($passkey): array => [
                        'created_at' => $passkey->created_at?->toIso8601String(),
                        'id' => $passkey->id,
                        'last_used_at' => $passkey->last_used_at?->toIso8601String(),
                        'name' => $passkey->name,
                    ],
                )
                ->all(),
        ];

        if (Features::canManageTwoFactorAuthentication()) {
            $request->ensureStateIsValid();

            $props['twoFactorEnabled'] = $request
                ->user()
                ->hasEnabledTwoFactorAuthentication();
            $props['requiresConfirmation'] = Features::optionEnabled(
                Features::twoFactorAuthentication(),
                'confirm',
            );
        }

        return Inertia::render('settings/security', $props);
    }

    /**
     * Update the user's password.
     */
    public function update(PasswordUpdateRequest $request): RedirectResponse
    {
        $request->user()->update([
            'password' => $request->password,
        ]);

        return Redirect::back();
    }
}
