<?php

use App\Models\Cargo;
use App\Models\User;
use App\Services\CargoDefinitionService;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\delete;
use function Pest\Laravel\get;
use function Pest\Laravel\patch;
use function Pest\Laravel\post;

function pterodactylEggPayload(): string
{
    return json_encode([
        '_comment' => 'Pterodactyl egg export',
        'meta' => [
            'version' => 'PTDL_v2',
            'update_url' => null,
        ],
        'exported_at' => '2026-03-27T14:32:59+01:00',
        'name' => 'Paper',
        'author' => 'parker@pterodactyl.io',
        'description' => 'High performance Spigot fork that aims to fix gameplay and mechanics inconsistencies.',
        'features' => ['eula', 'java_version'],
        'docker_images' => [
            'Java 21' => 'ghcr.io/ptero-eggs/yolks:java_21',
        ],
        'file_denylist' => [],
        'startup' => 'java -jar {{SERVER_JARFILE}}',
        'config' => [
            'files' => '{}',
            'startup' => '{"done":")! For help, type "}',
            'logs' => '{}',
            'stop' => 'stop',
        ],
        'scripts' => [
            'installation' => [
                'script' => '#!/bin/ash\necho installing',
                'container' => 'ghcr.io/ptero-eggs/installers:alpine',
                'entrypoint' => 'ash',
            ],
        ],
        'variables' => [[
            'name' => 'Server Jar File',
            'description' => 'The name of the server jarfile to run.',
            'env_variable' => 'SERVER_JARFILE',
            'default_value' => 'server.jar',
            'user_viewable' => true,
            'user_editable' => true,
            'rules' => 'required|string',
            'field_type' => 'text',
        ]],
    ], JSON_THROW_ON_ERROR);
}

test('non-admin cannot access admin cargo page', function () {
    $user = User::factory()->create(['is_admin' => false]);

    actingAs($user);

    get('/admin/cargo')->assertForbidden();
});

test('admin can access cargo page', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $cargo = Cargo::factory()->create();

    actingAs($admin);

    get('/admin/cargo')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/cargo')
            ->has('cargo.data', 1)
            ->where('cargo.data.0.name', $cargo->name)
            ->has('filters'));
});

test('admin can search cargo', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    Cargo::factory()->create(['name' => 'Paper']);
    Cargo::factory()->create(['name' => 'Velocity']);

    actingAs($admin);

    get('/admin/cargo?search=Pap')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('cargo.data', 1)
            ->where('cargo.data.0.name', 'Paper'));
});

test('admin can create cargo', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    actingAs($admin);

    post('/admin/cargo', [
        'name' => 'Paper',
        'author' => 'hello@skyport.sh',
        'description' => 'High performance Java server',
        'startup' => 'java -jar server.jar',
    ])->assertRedirect();

    $cargo = Cargo::query()->where('name', 'Paper')->first();

    expect($cargo)->not->toBeNull();
    expect($cargo?->slug)->toBe('paper');
    expect($cargo?->definition['meta']['version'])->toBe('SPDL_v1');
});

test('admin can import pterodactyl egg as cargo', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    actingAs($admin);

    post('/admin/cargo/import', [
        'content' => pterodactylEggPayload(),
    ])->assertRedirect();

    $cargo = Cargo::query()->where('name', 'Paper')->first();

    expect($cargo)->not->toBeNull();
    expect($cargo?->source_type)->toBe('pterodactyl');
    expect($cargo?->definition['meta']['source_format'])->toBe('pterodactyl');
    expect($cargo?->definition['variables'])->toHaveCount(1);
});

test('admin can update cargo from cargofile content', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $cargo = Cargo::factory()->create();
    $service = app(CargoDefinitionService::class);
    $payload = $service->starter([
        'name' => 'Updated Cargo',
        'author' => 'ops@skyport.sh',
        'description' => 'Updated description',
        'startup' => './boot.sh',
    ]);
    $payload['variables'][] = [
        'name' => 'Build Number',
        'description' => 'Build to install',
        'env_variable' => 'BUILD_NUMBER',
        'default_value' => 'latest',
        'user_viewable' => true,
        'user_editable' => true,
        'rules' => 'required|string|max:20',
        'field_type' => 'text',
    ];

    actingAs($admin);

    patch("/admin/cargo/{$cargo->id}", [
        'cargofile' => $service->serialize($payload),
    ])->assertRedirect();

    $cargo->refresh();

    expect($cargo->name)->toBe('Updated Cargo');
    expect($cargo->slug)->toBe('updated-cargo');
    expect($cargo->definition['variables'])->toHaveCount(1);
});

test('admin can delete cargo', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $cargo = Cargo::factory()->create();

    actingAs($admin);

    delete("/admin/cargo/{$cargo->id}")->assertRedirect();

    expect(Cargo::find($cargo->id))->toBeNull();
});

test('admin can bulk delete cargo', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $cargo = Cargo::factory()->count(2)->create();

    actingAs($admin);

    delete('/admin/cargo/bulk-destroy', [
        'ids' => $cargo->pluck('id')->all(),
    ])->assertRedirect();

    expect(Cargo::query()->count())->toBe(0);
});
