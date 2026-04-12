<?php

use App\Models\Cargo;
use App\Models\Server;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\delete;
use function Pest\Laravel\get;
use function Pest\Laravel\post;

test('cargo index exposes the depot catalog payload', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    actingAs($admin);

    get('/admin/cargo')
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->component('admin/cargo')
                ->has('depot.items')
                ->has('depot.categories')
                ->where('depot.source_url', config('depot.source_url')),
        );
});

test('admin can install a depot entry as a cargo', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    actingAs($admin);

    post('/admin/depot/minecraft-paper/install')->assertRedirect();

    $cargo = Cargo::query()->where('slug', 'minecraft-paper')->first();

    expect($cargo)->not->toBeNull();
    expect($cargo?->name)->toBe('Minecraft: Paper');
    expect($cargo?->source_type)->toBe('native');
    expect($cargo?->install_container)->toBe(
        'ghcr.io/skyportsh/installers:debian',
    );
    expect($cargo?->definition['variables'])->not->toBeEmpty();
});

test('installing the same depot entry twice is idempotent', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    actingAs($admin);

    post('/admin/depot/minecraft-vanilla/install')->assertRedirect();
    post('/admin/depot/minecraft-vanilla/install')->assertRedirect();

    expect(
        Cargo::query()->where('slug', 'minecraft-vanilla')->count(),
    )->toBe(1);
});

test('admin can remove a depot cargo via the depot endpoint', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    actingAs($admin);

    post('/admin/depot/runtime-nodejs/install')->assertRedirect();

    expect(
        Cargo::query()->where('slug', 'nodejs-generic')->exists(),
    )->toBeTrue();

    delete('/admin/depot/runtime-nodejs')->assertRedirect();

    expect(
        Cargo::query()->where('slug', 'nodejs-generic')->exists(),
    )->toBeFalse();
});

test('unknown depot key returns a validation error', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    actingAs($admin);

    post('/admin/depot/does-not-exist/install')
        ->assertRedirect()
        ->assertSessionHasErrors('key');
});

test('non-admin cannot install from depot', function () {
    $user = User::factory()->create(['is_admin' => false]);

    actingAs($user);

    post('/admin/depot/minecraft-vanilla/install')->assertForbidden();
});

test('admin cannot remove a depot cargo that has servers', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    actingAs($admin);

    post('/admin/depot/runtime-python/install')->assertRedirect();

    $cargo = Cargo::query()->where('slug', 'python-generic')->first();
    Server::factory()->create(['cargo_id' => $cargo->id]);

    delete('/admin/depot/runtime-python')
        ->assertRedirect()
        ->assertSessionHasErrors('key');

    expect(
        Cargo::query()->where('slug', 'python-generic')->exists(),
    )->toBeTrue();
});

test('depot installed map reflects already installed entries', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    actingAs($admin);

    post('/admin/depot/game-rust/install')->assertRedirect();

    get('/admin/cargo')
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page->where(
                'depot.installed.rust',
                fn ($value) => is_int($value) && $value > 0,
            ),
        );
});
