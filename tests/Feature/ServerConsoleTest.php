<?php

use App\Models\Allocation;
use App\Models\Cargo;
use App\Models\Location;
use App\Models\Node;
use App\Models\NodeCredential;
use App\Models\Server;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\postJson;

function serverConsoleDependencies(): array
{
    $location = Location::factory()->create();
    $node = Node::factory()->create([
        'daemon_port' => 2800,
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'fqdn' => 'node.example.com',
        'location_id' => $location->id,
        'use_ssl' => true,
    ]);
    $cargo = Cargo::factory()->create(['name' => 'Paper']);

    NodeCredential::factory()->create([
        'daemon_callback_token' => 'callback-token',
        'node_id' => $node->id,
    ]);

    $user = User::factory()->create();
    $server = Server::factory()->create([
        'allocation_id' => Allocation::factory()->create([
            'bind_ip' => '203.0.113.10',
            'ip_alias' => 'play.example.test',
            'node_id' => $node->id,
            'port' => 25565,
        ])->id,
        'cargo_id' => $cargo->id,
        'name' => 'Alpha',
        'node_id' => $node->id,
        'status' => 'offline',
        'user_id' => $user->id,
    ]);

    return [
        'server' => $server,
        'user' => $user,
    ];
}

test('server owner can view the console page', function () {
    $dependencies = serverConsoleDependencies();

    actingAs($dependencies['user']);

    get("/server/{$dependencies['server']->id}/console")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('server/console')
            ->where('server.id', $dependencies['server']->id)
            ->where('server.name', 'Alpha')
            ->where('server.cpu_limit', $dependencies['server']->cpu_limit)
            ->where('server.memory_mib', $dependencies['server']->memory_mib)
            ->where('server.disk_mib', $dependencies['server']->disk_mib)
            ->where('server.cargo.name', 'Paper')
            ->where('server.node.name', $dependencies['server']->node->name)
            ->where('server.allocation.port', 25565)
            ->where('server.allowed_actions.start', true)
            ->where('server.allowed_actions.reinstall', true)
            ->where('server.allowed_actions.kill', false)
            ->has('serverSwitcher', 1)
            ->where('serverSwitcher.0.id', $dependencies['server']->id)
            ->where('serverSwitcher.0.name', 'Alpha')
            ->where('serverSwitcher.0.status', 'offline'));
});

test('removed server filesystem page is not found', function () {
    $dependencies = serverConsoleDependencies();

    actingAs($dependencies['user']);

    get("/server/{$dependencies['server']->id}/filesystem")->assertNotFound();
});

test('admin can view the console page for any server', function () {
    $dependencies = serverConsoleDependencies();
    $admin = User::factory()->create(['is_admin' => true]);
    $adminServer = Server::factory()->create([
        'allocation_id' => Allocation::factory()->create([
            'bind_ip' => '203.0.113.20',
            'node_id' => $dependencies['server']->node_id,
            'port' => 25566,
        ])->id,
        'cargo_id' => $dependencies['server']->cargo_id,
        'name' => 'Admin Server',
        'node_id' => $dependencies['server']->node_id,
        'status' => 'running',
        'user_id' => $admin->id,
    ]);

    actingAs($admin);

    get("/server/{$dependencies['server']->id}/console")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('serverSwitcher', 1)
            ->where('serverSwitcher.0.name', 'Alpha')
            ->where('serverSwitcher.0.id', $dependencies['server']->id));
});

test('console page still renders when the primary allocation has been removed', function () {
    $dependencies = serverConsoleDependencies();

    Allocation::query()->findOrFail($dependencies['server']->allocation_id)->delete();

    actingAs($dependencies['user']);

    get("/server/{$dependencies['server']->id}/console")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('server.id', $dependencies['server']->id)
            ->where('server.allocation', null));
});

test('other users cannot view the console page', function () {
    $dependencies = serverConsoleDependencies();

    actingAs(User::factory()->create());

    get("/server/{$dependencies['server']->id}/console")->assertForbidden();
});

test('server owner can send an allowed power action', function () {
    Http::fake([
        'https://node.example.com:2800/api/daemon/servers/*/power' => Http::response([
            'ok' => true,
        ]),
    ]);

    $dependencies = serverConsoleDependencies();

    actingAs($dependencies['user']);

    postJson("/api/client/servers/{$dependencies['server']->id}/power", [
        'signal' => 'start',
    ])
        ->assertSuccessful()
        ->assertJson([
            'ok' => true,
            'server' => [
                'id' => $dependencies['server']->id,
                'status' => 'offline',
            ],
        ]);

    Http::assertSent(function ($request) use ($dependencies) {
        return $request->url() === "https://node.example.com:2800/api/daemon/servers/{$dependencies['server']->id}/power"
            && $request->hasHeader('Authorization', 'Bearer callback-token')
            && $request['panel_version'] === config('app.version')
            && $request['signal'] === 'start'
            && $request['uuid'] === '550e8400-e29b-41d4-a716-446655440000';
    });
});

test('server owner can request a reinstall', function () {
    Http::fake([
        'https://node.example.com:2800/api/daemon/servers/*/power' => Http::response([
            'ok' => true,
        ]),
    ]);

    $dependencies = serverConsoleDependencies();

    actingAs($dependencies['user']);

    postJson("/api/client/servers/{$dependencies['server']->id}/power", [
        'signal' => 'reinstall',
    ])
        ->assertSuccessful()
        ->assertJson([
            'ok' => true,
            'server' => [
                'id' => $dependencies['server']->id,
                'status' => 'offline',
                'allowed_actions' => [
                    'reinstall' => true,
                ],
            ],
        ]);

    Http::assertSent(function ($request) use ($dependencies) {
        return $request->url() === "https://node.example.com:2800/api/daemon/servers/{$dependencies['server']->id}/power"
            && $request['signal'] === 'reinstall';
    });
});

test('server owner can send stop and restart actions while running', function () {
    Http::fake([
        'https://node.example.com:2800/api/daemon/servers/*/power' => Http::response([
            'ok' => true,
        ]),
    ]);

    $dependencies = serverConsoleDependencies();
    $dependencies['server']->forceFill(['status' => 'running'])->save();

    actingAs($dependencies['user']);

    postJson("/api/client/servers/{$dependencies['server']->id}/power", [
        'signal' => 'stop',
    ])->assertSuccessful();

    postJson("/api/client/servers/{$dependencies['server']->id}/power", [
        'signal' => 'restart',
    ])->assertSuccessful();

    Http::assertSentCount(2);
    Http::assertSent(fn ($request) => $request['signal'] === 'stop');
    Http::assertSent(fn ($request) => $request['signal'] === 'restart');
});

test('unsupported power actions are rejected by validation', function () {
    Http::fake();

    $dependencies = serverConsoleDependencies();

    actingAs($dependencies['user']);

    postJson("/api/client/servers/{$dependencies['server']->id}/power", [
        'signal' => 'explode',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['signal']);

    Http::assertNothingSent();
});

test('power actions require daemon callback configuration', function () {
    Http::fake();

    $dependencies = serverConsoleDependencies();
    $dependencies['server']->node->credential?->delete();

    actingAs($dependencies['user']);

    postJson("/api/client/servers/{$dependencies['server']->id}/power", [
        'signal' => 'start',
    ])
        ->assertUnprocessable()
        ->assertJson([
            'message' => 'Power controls are not available for this server yet.',
        ]);

    Http::assertNothingSent();
});
