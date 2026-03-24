<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('billing page is displayed', function () {
    $user = User::factory()->create([
        'preferred_currency' => 'USD',
    ]);

    $this->actingAs($user)
        ->get(route('billing.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/billing')
            ->where('billing.preferredCurrency', 'USD')
            ->has('currencies', 6),
        );
});

test('preferred currency can be updated', function () {
    $user = User::factory()->create([
        'preferred_currency' => 'USD',
        'preferred_currency_overridden' => false,
    ]);

    $response = $this
        ->actingAs($user)
        ->patch(route('billing.update'), [
            'preferred_currency' => 'EUR',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('billing.edit'));

    expect($user->refresh()->preferred_currency)->toBe('EUR');
    expect($user->preferred_currency_overridden)->toBeTrue();
    expect($user->coins_balance)->toBe(0);
    expect($user->credit_balance)->toBe(0);
});

test('preferred currency must be supported', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('billing.edit'))
        ->patch(route('billing.update'), [
            'preferred_currency' => 'BTC',
        ]);

    $response
        ->assertSessionHasErrors('preferred_currency')
        ->assertRedirect(route('billing.edit'));
});
