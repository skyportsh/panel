<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Support\Countries;
use App\Support\IpCountryResolver;
use App\Support\PreferredCurrency;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request, IpCountryResolver $ipCountryResolver): Response
    {
        $user = $request->user();

        return Inertia::render('settings/profile', [
            'countries' => Countries::all(),
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'suggestedAccountRegion' => $user->account_region
                ?? $ipCountryResolver->resolve($user->registration_ip)
                ?? $ipCountryResolver->resolve($user->last_seen_ip),
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if (
            $request->user()->isDirty('account_region')
            && ! $request->user()->preferred_currency_overridden
        ) {
            $request->user()->preferred_currency = PreferredCurrency::forRegion(
                $request->user()->account_region,
            );
        }

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
