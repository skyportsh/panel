<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

test('confirm password screen can be rendered', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('password.confirm'));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('auth/confirm-password'),
    );
});

test('password confirmation requires authentication', function () {
    $response = $this->get(route('password.confirm'));

    $response->assertRedirect(route('login'));
});

test('password confirmation supports legacy bcrypt passwords', function () {
    $user = User::factory()->create();

    DB::table('users')
        ->whereKey($user->id)
        ->update([
            'password' => password_hash('password', PASSWORD_BCRYPT, ['cost' => 12]),
        ]);

    $response = $this->actingAs($user)->post(route('password.confirm.store'), [
        'password' => 'password',
    ]);

    $response->assertRedirect();
    $response->assertSessionHasNoErrors();
    expect(session('auth.password_confirmed_at'))->not->toBeNull();
});
