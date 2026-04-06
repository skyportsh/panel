<?php

use App\Models\Allocation;
use App\Models\Cargo;
use App\Models\Location;
use App\Models\Node;
use App\Models\NodeCredential;
use App\Models\Server;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\delete;
use function Pest\Laravel\get;
use function Pest\Laravel\patch;
use function Pest\Laravel\post;

function serverDependencies(): array
{
    $location = Location::factory()->create();
    $node = Node::factory()->create(['location_id' => $location->id]);

    return [
        'cargo' => Cargo::factory()->create(),
        'node' => $node,
        'allocation' => Allocation::factory()->create(['node_id' => $node->id]),
        'user' => User::factory()->create(),
    ];
}

test('non-admin cannot access admin servers page', function () {
    $user = User::factory()->create(['is_admin' => false]);

    actingAs($user);

    get('/admin/servers')->assertForbidden();
});

test('admin can access servers page', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $dependencies = serverDependencies();
    $server = Server::factory()->create([
        'cargo_id' => $dependencies['cargo']->id,
        'allocation_id' => $dependencies['allocation']->id,
        'node_id' => $dependencies['node']->id,
        'user_id' => $dependencies['user']->id,
    ]);

    actingAs($admin);

    get('/admin/servers')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/servers')
            ->has('servers.data', 1)
            ->where('servers.data.0.name', $server->name)
            ->where('servers.data.0.user.name', $dependencies['user']->name)
            ->where('servers.data.0.node.name', $dependencies['node']->name)
            ->where('servers.data.0.cargo.name', $dependencies['cargo']->name)
            ->where('servers.data.0.allocation.port', $dependencies['allocation']->port)
            ->has('users', 2)
            ->has('nodes', 1)
            ->has('allocations', 1)
            ->has('cargo', 1)
            ->has('filters'));
});

test('admin servers page renders with empty data when server tables are unavailable', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    Schema::drop('servers');
    Schema::drop('allocations');

    actingAs($admin);

    get('/admin/servers')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/servers')
            ->has('servers.data', 0)
            ->has('users', 1)
            ->has('nodes', 0)
            ->has('allocations', 0)
            ->has('cargo', 0)
            ->where('filters.search', ''));
});

test('admin can search servers', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $dependencies = serverDependencies();

    Server::factory()->create([
        'cargo_id' => $dependencies['cargo']->id,
        'allocation_id' => $dependencies['allocation']->id,
        'name' => 'Paper Survival',
        'node_id' => $dependencies['node']->id,
        'user_id' => $dependencies['user']->id,
    ]);
    Server::factory()->create([
        'cargo_id' => $dependencies['cargo']->id,
        'allocation_id' => Allocation::factory()->create(['node_id' => $dependencies['node']->id])->id,
        'name' => 'Velocity Proxy',
        'node_id' => $dependencies['node']->id,
        'user_id' => $dependencies['user']->id,
    ]);

    actingAs($admin);

    get('/admin/servers?search=Paper')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('servers.data', 1)
            ->where('servers.data.0.name', 'Paper Survival'));
});

test('admin servers page paginates results', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $dependencies = serverDependencies();

    foreach (range(1, 11) as $number) {
        Server::factory()->create([
            'cargo_id' => $dependencies['cargo']->id,
            'allocation_id' => Allocation::factory()->create([
                'node_id' => $dependencies['node']->id,
            ])->id,
            'name' => "Server {$number}",
            'node_id' => $dependencies['node']->id,
            'updated_at' => now()->subMinutes(20 - $number),
            'user_id' => $dependencies['user']->id,
        ]);
    }

    actingAs($admin);

    get('/admin/servers?page=2')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('servers.current_page', 2)
            ->where('servers.last_page', 2)
            ->where('servers.total', 11)
            ->has('servers.data', 1)
            ->where('servers.data.0.name', 'Server 1'));
});

test('admin can create a server and push it to skyportd', function () {
    Http::fake([
        'http://node.example.com:2800/api/daemon/servers/sync' => Http::response([
            'ok' => true,
        ]),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $dependencies = serverDependencies();
    $dependencies['node']->forceFill([
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'daemon_port' => 2800,
        'fqdn' => 'node.example.com',
        'use_ssl' => false,
    ])->save();
    NodeCredential::factory()->create([
        'daemon_callback_token' => 'callback-token',
        'node_id' => $dependencies['node']->id,
    ]);

    actingAs($admin);

    post('/admin/servers', [
        'name' => 'Paper Survival',
        'user_id' => $dependencies['user']->id,
        'node_id' => $dependencies['node']->id,
        'cargo_id' => $dependencies['cargo']->id,
        'allocation_id' => $dependencies['allocation']->id,
        'memory_mib' => 4096,
        'cpu_limit' => 200,
        'disk_mib' => 20480,
    ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Server created. skyportd saved the server state.');

    $server = Server::query()->where('name', 'Paper Survival')->first();

    expect($server)->not->toBeNull();
    expect($server?->user_id)->toBe($dependencies['user']->id);
    expect($server?->node_id)->toBe($dependencies['node']->id);
    expect($server?->cargo_id)->toBe($dependencies['cargo']->id);
    expect($server?->allocation_id)->toBe($dependencies['allocation']->id);
    expect($server?->status)->toBe('installing');

    Http::assertSent(function ($request) use ($server) {
        return $request->url() === 'http://node.example.com:2800/api/daemon/servers/sync'
            && $request->hasHeader('Authorization', 'Bearer callback-token')
            && $request['uuid'] === '550e8400-e29b-41d4-a716-446655440000'
            && $request['server']['id'] === $server?->id
            && $request['server']['allocation']['port'] === $server?->allocation?->port
            && $request['server']['cargo']['startup_command'] === './start.sh';
    });
});

test('admin can download an install log from skyportd', function () {
    Http::fake([
        'http://node.example.com:2800/api/daemon/servers/1/install-log*' => Http::response(
            "[system] Preparing volume directory...\n[install] Downloading files...\n",
            200,
            ['Content-Type' => 'text/plain; charset=utf-8'],
        ),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $dependencies = serverDependencies();
    $dependencies['node']->forceFill([
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440001',
        'daemon_port' => 2800,
        'fqdn' => 'node.example.com',
        'use_ssl' => false,
    ])->save();
    NodeCredential::factory()->create([
        'daemon_callback_token' => 'callback-token',
        'node_id' => $dependencies['node']->id,
    ]);
    $server = Server::factory()->create([
        'cargo_id' => $dependencies['cargo']->id,
        'allocation_id' => $dependencies['allocation']->id,
        'last_error' => 'Installation failed with exit code 2.',
        'node_id' => $dependencies['node']->id,
        'status' => 'install_failed',
        'user_id' => $dependencies['user']->id,
    ]);

    actingAs($admin);

    $response = get("/admin/servers/{$server->id}/install-log");

    $response->assertSuccessful();
    expect($response->streamedContent())->toContain('[install] Downloading files...');
    $response->assertHeader('content-type', 'text/plain; charset=utf-8');

    Http::assertSent(function ($request) use ($server) {
        return $request->method() === 'GET'
            && str_contains($request->url(), "http://node.example.com:2800/api/daemon/servers/{$server->id}/install-log")
            && $request->hasHeader('Authorization', 'Bearer callback-token')
            && $request['uuid'] === '550e8400-e29b-41d4-a716-446655440001'
            && $request['panel_version'] === config('app.version');
    });
});

test('admin can request a server reinstall', function () {
    Http::fake([
        'http://node.example.com:2800/api/daemon/servers/*/power' => Http::response([
            'ok' => true,
        ]),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $dependencies = serverDependencies();
    $dependencies['node']->forceFill([
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440002',
        'daemon_port' => 2800,
        'fqdn' => 'node.example.com',
        'use_ssl' => false,
    ])->save();
    NodeCredential::factory()->create([
        'daemon_callback_token' => 'callback-token',
        'node_id' => $dependencies['node']->id,
    ]);
    $server = Server::factory()->create([
        'cargo_id' => $dependencies['cargo']->id,
        'allocation_id' => $dependencies['allocation']->id,
        'node_id' => $dependencies['node']->id,
        'status' => 'install_failed',
        'user_id' => $dependencies['user']->id,
    ]);

    actingAs($admin);

    post("/admin/servers/{$server->id}/reinstall")
        ->assertRedirect()
        ->assertSessionHas(
            'success',
            'Server reinstall requested. skyportd will clear the server files and install it again.',
        );

    Http::assertSent(function ($request) use ($server) {
        return $request->method() === 'POST'
            && $request->url() === "http://node.example.com:2800/api/daemon/servers/{$server->id}/power"
            && $request->hasHeader('Authorization', 'Bearer callback-token')
            && $request['signal'] === 'reinstall'
            && $request['uuid'] === '550e8400-e29b-41d4-a716-446655440002';
    });
});

test('admin can update a server on the same node and sync new limits to skyportd', function () {
    Http::fake([
        'http://node.example.com:2800/api/daemon/servers/sync' => Http::response([
            'ok' => true,
        ]),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $dependencies = serverDependencies();
    $dependencies['node']->forceFill([
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440001',
        'daemon_port' => 2800,
        'fqdn' => 'node.example.com',
        'use_ssl' => false,
    ])->save();
    NodeCredential::factory()->create([
        'daemon_callback_token' => 'callback-token',
        'node_id' => $dependencies['node']->id,
    ]);
    $server = Server::factory()->create([
        'cargo_id' => $dependencies['cargo']->id,
        'allocation_id' => $dependencies['allocation']->id,
        'node_id' => $dependencies['node']->id,
        'user_id' => $dependencies['user']->id,
    ]);
    $newUser = User::factory()->create();
    $newAllocation = Allocation::factory()->create(['node_id' => $dependencies['node']->id]);

    actingAs($admin);

    patch("/admin/servers/{$server->id}", [
        'name' => 'Updated Survival',
        'user_id' => $newUser->id,
        'node_id' => $dependencies['node']->id,
        'cargo_id' => $dependencies['cargo']->id,
        'allocation_id' => $newAllocation->id,
        'memory_mib' => 8192,
        'cpu_limit' => 0,
        'disk_mib' => 40960,
    ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Server updated. skyportd saved the new server state.');

    $server->refresh();

    expect($server->name)->toBe('Updated Survival');
    expect($server->user_id)->toBe($newUser->id);
    expect($server->node_id)->toBe($dependencies['node']->id);
    expect($server->cargo_id)->toBe($dependencies['cargo']->id);
    expect($server->allocation_id)->toBe($newAllocation->id);
    expect($server->memory_mib)->toBe(8192);
    expect($server->cpu_limit)->toBe(0);
    expect($server->disk_mib)->toBe(40960);

    Http::assertSent(function ($request) use ($server, $newAllocation) {
        return $request->method() === 'POST'
            && $request->url() === 'http://node.example.com:2800/api/daemon/servers/sync'
            && $request->hasHeader('Authorization', 'Bearer callback-token')
            && $request['uuid'] === '550e8400-e29b-41d4-a716-446655440001'
            && $request['server']['id'] === $server->id
            && $request['server']['limits']['memory_mib'] === 8192
            && $request['server']['allocation']['id'] === $newAllocation->id;
    });
});

test('admin cannot change a server node or cargo after creation', function () {
    Http::fake();

    $admin = User::factory()->create(['is_admin' => true]);
    $dependencies = serverDependencies();
    $otherDependencies = serverDependencies();
    $server = Server::factory()->create([
        'cargo_id' => $dependencies['cargo']->id,
        'allocation_id' => $dependencies['allocation']->id,
        'node_id' => $dependencies['node']->id,
        'user_id' => $dependencies['user']->id,
    ]);

    actingAs($admin);

    patch("/admin/servers/{$server->id}", [
        'name' => 'Updated Survival',
        'user_id' => $dependencies['user']->id,
        'node_id' => $otherDependencies['node']->id,
        'cargo_id' => $otherDependencies['cargo']->id,
        'allocation_id' => $dependencies['allocation']->id,
        'memory_mib' => 8192,
        'cpu_limit' => 0,
        'disk_mib' => 40960,
    ])
        ->assertSessionHasErrors([
            'node_id' => 'The node cannot be changed after the server is created.',
            'cargo_id' => 'The cargo cannot be changed after the server is created.',
        ]);

    Http::assertNothingSent();
});

test('admin can delete a server and remove it from skyportd', function () {
    Http::fake([
        'http://node.example.com:2800/api/daemon/servers/*' => Http::response([
            'ok' => true,
        ]),
    ]);

    $admin = User::factory()->create(['is_admin' => true]);
    $dependencies = serverDependencies();
    $dependencies['node']->forceFill([
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440003',
        'daemon_port' => 2800,
        'fqdn' => 'node.example.com',
        'use_ssl' => false,
    ])->save();
    NodeCredential::factory()->create([
        'daemon_callback_token' => 'callback-token',
        'node_id' => $dependencies['node']->id,
    ]);
    $server = Server::factory()->create([
        'cargo_id' => $dependencies['cargo']->id,
        'allocation_id' => $dependencies['allocation']->id,
        'node_id' => $dependencies['node']->id,
        'user_id' => $dependencies['user']->id,
    ]);

    actingAs($admin);

    delete("/admin/servers/{$server->id}")
        ->assertRedirect()
        ->assertSessionHas('success', 'Server deleted. skyportd removed the server state.');

    expect(Server::find($server->id))->toBeNull();

    Http::assertSent(function ($request) use ($server) {
        return $request->method() === 'DELETE'
            && $request->url() === "http://node.example.com:2800/api/daemon/servers/{$server->id}"
            && $request->hasHeader('Authorization', 'Bearer callback-token')
            && $request['uuid'] === '550e8400-e29b-41d4-a716-446655440003';
    });
});

test('admin can bulk delete servers', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $dependencies = serverDependencies();
    $servers = collect([
        Server::factory()->create([
            'cargo_id' => $dependencies['cargo']->id,
            'allocation_id' => $dependencies['allocation']->id,
            'node_id' => $dependencies['node']->id,
            'user_id' => $dependencies['user']->id,
        ]),
        Server::factory()->create([
            'cargo_id' => $dependencies['cargo']->id,
            'allocation_id' => Allocation::factory()->create(['node_id' => $dependencies['node']->id])->id,
            'node_id' => $dependencies['node']->id,
            'user_id' => $dependencies['user']->id,
        ]),
    ]);

    actingAs($admin);

    delete('/admin/servers/bulk-destroy', [
        'ids' => $servers->pluck('id')->all(),
    ])->assertRedirect();

    expect(Server::query()->count())->toBe(0);
});
