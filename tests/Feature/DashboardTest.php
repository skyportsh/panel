<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('home'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('home'));
    $response->assertOk();
});

test('authenticated requests update the last seen ip', function () {
    $user = User::factory()->create([
        'last_seen_ip' => null,
    ]);

    $this->actingAs($user)
        ->withServerVariables(['REMOTE_ADDR' => '203.0.113.24'])
        ->get(route('home'))
        ->assertOk();

    expect($user->fresh()->last_seen_ip)->toBe('203.0.113.24');
});
