<?php

use App\Models\Allocation;
use App\Models\Cargo;
use App\Models\Location;
use App\Models\Node;
use App\Models\NodeCredential;
use App\Models\Server;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;

function websocketServerDependencies(): array
{
    $location = Location::factory()->create();
    $node = Node::factory()->create([
        'daemon_port' => 2800,
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'fqdn' => 'node.example.com',
        'location_id' => $location->id,
        'use_ssl' => true,
    ]);

    NodeCredential::factory()->create([
        'daemon_callback_token' => 'callback-token',
        'node_id' => $node->id,
    ]);

    $user = User::factory()->create();

    return [
        'server' => Server::factory()->create([
            'allocation_id' => Allocation::factory()->create(['node_id' => $node->id])->id,
            'cargo_id' => Cargo::factory()->create()->id,
            'node_id' => $node->id,
            'user_id' => $user->id,
        ]),
        'user' => $user,
    ];
}

test('server owner can fetch websocket credentials', function () {
    $dependencies = websocketServerDependencies();

    actingAs($dependencies['user']);

    $response = getJson("/api/client/servers/{$dependencies['server']->id}/websocket");

    $response->assertSuccessful();

    expect($response->json('data.socket'))
        ->toBe("wss://node.example.com:2800/api/daemon/servers/{$dependencies['server']->id}/ws?uuid=550e8400-e29b-41d4-a716-446655440000&panel_version=0.1.0");
    expect($response->json('data.expires_at'))->not->toBeEmpty();
    expect($response->json('data.token'))
        ->toContain('.')
        ->not->toContain('callback-token');
});

test('admin can fetch websocket credentials for any server', function () {
    $dependencies = websocketServerDependencies();
    $admin = User::factory()->create(['is_admin' => true]);

    actingAs($admin);

    getJson("/api/client/servers/{$dependencies['server']->id}/websocket")
        ->assertSuccessful();
});

test('other users cannot fetch websocket credentials for a server they do not own', function () {
    $dependencies = websocketServerDependencies();
    $otherUser = User::factory()->create();

    actingAs($otherUser);

    getJson("/api/client/servers/{$dependencies['server']->id}/websocket")
        ->assertForbidden();
});

test('websocket credentials require a configured daemon callback token', function () {
    $location = Location::factory()->create();
    $node = Node::factory()->create([
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'fqdn' => 'node.example.com',
        'location_id' => $location->id,
    ]);
    $user = User::factory()->create();
    $server = Server::factory()->create([
        'allocation_id' => Allocation::factory()->create(['node_id' => $node->id])->id,
        'cargo_id' => Cargo::factory()->create()->id,
        'node_id' => $node->id,
        'user_id' => $user->id,
    ]);

    actingAs($user);

    getJson("/api/client/servers/{$server->id}/websocket")
        ->assertUnprocessable()
        ->assertJson([
            'message' => 'The websocket is not available for this server yet.',
        ]);
});
