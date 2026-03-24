<?php

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyFeature(Features::registration());
});

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    Notification::fake();
    Http::fake([
        'http://ip-api.com/*' => Http::response([
            'status' => 'success',
            'countryCode' => 'GB',
        ]),
    ]);

    $response = $this
        ->withServerVariables(['REMOTE_ADDR' => '8.8.8.8'])
        ->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

    $this->assertAuthenticated();
    Notification::assertSentTo(auth()->user(), VerifyEmail::class);
    expect(auth()->user()->registration_ip)->toBe('8.8.8.8');
    expect(auth()->user()->account_region)->toBe('GB');
    expect(auth()->user()->fresh()->preferred_currency)->toBe('GBP');
    expect(auth()->user()->fresh()->preferred_currency_overridden)->toBeFalse();
    expect(auth()->user()->fresh()->hasVerifiedEmail())->toBeFalse();
    $response->assertRedirect(route('home', absolute: false));
});
