<?php

use App\Models\User;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyFeature(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    $response = $this
        ->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('home', absolute: false));
});

test('new user passwords are hashed with argon2id', function () {
    $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'argon@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $user = User::query()->where('email', 'argon@example.com')->firstOrFail();

    expect(config('hashing.driver'))->toBe('argon2id');
    expect(password_get_info($user->password)['algoName'])->toBe('argon2id');
});
