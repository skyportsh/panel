<?php

use App\Models\User;
use App\Services\AppSettingsService;

it('shares themeCSS prop on authenticated pages', function () {
    $service = app(AppSettingsService::class);
    $service->setTheme('catppuccin');

    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('home'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->where('themeCSS', fn ($value) => str_contains($value, '--background') && str_contains($value, '--brand')
    ));
});

it('shares themeCSS prop on unauthenticated pages', function () {
    $service = app(AppSettingsService::class);
    $service->setTheme('catppuccin');

    $response = $this->get(route('login'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->where('themeCSS', fn ($value) => str_contains($value, '--background') && str_contains($value, '--brand')
    ));
});

it('shares null themeCSS when using default magma theme', function () {
    $service = app(AppSettingsService::class);
    $service->setTheme('magma');

    $response = $this->get(route('login'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->has('themeCSS'));
});
