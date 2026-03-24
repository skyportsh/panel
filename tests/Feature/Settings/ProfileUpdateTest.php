<?php

use App\Models\User;
use App\Support\IpCountryResolver;
use Inertia\Testing\AssertableInertia as Assert;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile page includes countries and inferred account region', function () {
    $user = User::factory()->create([
        'account_region' => null,
        'registration_ip' => '8.8.8.8',
        'last_seen_ip' => null,
    ]);

    $this->app->bind(IpCountryResolver::class, fn () => new class extends IpCountryResolver
    {
        public function resolve(?string $ipAddress): ?string
        {
            return $ipAddress === '8.8.8.8' ? 'GB' : null;
        }
    });

    $this->actingAs($user)
        ->withServerVariables(['REMOTE_ADDR' => '1.1.1.1'])
        ->get(route('profile.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/profile')
            ->where('suggestedAccountRegion', 'GB')
            ->has('countries')
        );
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'account_region' => 'GB',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->account_region)->toBe('GB');
    expect($user->preferred_currency)->toBe('GBP');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
            'account_region' => 'US',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
    expect($user->account_region)->toBe('US');
    expect($user->preferred_currency)->toBe('USD');
});

test('preferred currency stays manual when user has overridden it', function () {
    $user = User::factory()->create([
        'preferred_currency' => 'JPY',
        'preferred_currency_overridden' => true,
    ]);

    $this->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => $user->name,
            'email' => $user->email,
            'account_region' => 'GB',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->account_region)->toBe('GB');
    expect($user->preferred_currency)->toBe('JPY');
});

test('account region must be supported', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
            'account_region' => 'XX',
        ]);

    $response
        ->assertSessionHasErrors('account_region')
        ->assertRedirect(route('profile.edit'));
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('welcome'));

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});
