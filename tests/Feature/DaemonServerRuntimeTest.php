<?php

use App\Models\Allocation;
use App\Models\Cargo;
use App\Models\Location;
use App\Models\Node;
use App\Models\NodeCredential;
use App\Models\Server;
use App\Models\User;

use function Pest\Laravel\postJson;

function daemonRuntimeServer(): Server
{
    $location = Location::factory()->create();
    $node = Node::factory()->create([
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'location_id' => $location->id,
    ]);

    NodeCredential::factory()->create([
        'daemon_secret_hash' => hash('sha256', 'daemon-secret'),
        'node_id' => $node->id,
    ]);

    return Server::factory()->create([
        'allocation_id' => Allocation::factory()->create(['node_id' => $node->id])->id,
        'cargo_id' => Cargo::factory()->create()->id,
        'node_id' => $node->id,
        'status' => 'installing',
        'user_id' => User::factory()->create()->id,
    ]);
}

test('daemon can report an install failure for a server', function () {
    $server = daemonRuntimeServer();

    $response = postJson(
        "/api/daemon/servers/{$server->id}/runtime",
        [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'version' => '0.1.0',
            'status' => 'install_failed',
            'last_error' => 'Installation failed with exit code 2.',
        ],
        ['Authorization' => 'Bearer daemon-secret'],
    );

    $response
        ->assertSuccessful()
        ->assertJson([
            'ok' => true,
            'server' => [
                'id' => $server->id,
                'last_error' => 'Installation failed with exit code 2.',
                'status' => 'install_failed',
            ],
        ]);

    expect($server->fresh()->status)->toBe('install_failed');
    expect($server->fresh()->last_error)->toBe('Installation failed with exit code 2.');
});

test('daemon can update server runtime state and clear a previous error', function () {
    $server = daemonRuntimeServer();
    $server->forceFill([
        'last_error' => 'Server exited before startup completed.',
        'status' => 'offline',
    ])->save();

    postJson(
        "/api/daemon/servers/{$server->id}/runtime",
        [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'version' => '0.1.0',
            'status' => 'running',
            'last_error' => null,
        ],
        ['Authorization' => 'Bearer daemon-secret'],
    )
        ->assertSuccessful()
        ->assertJson([
            'ok' => true,
            'server' => [
                'id' => $server->id,
                'last_error' => null,
                'status' => 'running',
            ],
        ]);

    expect($server->fresh()->status)->toBe('running');
    expect($server->fresh()->last_error)->toBeNull();
});

test('daemon can record stopping and restarting runtime states', function () {
    $server = daemonRuntimeServer();

    postJson(
        "/api/daemon/servers/{$server->id}/runtime",
        [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'version' => '0.1.0',
            'status' => 'stopping',
            'last_error' => null,
        ],
        ['Authorization' => 'Bearer daemon-secret'],
    )
        ->assertSuccessful()
        ->assertJsonPath('server.status', 'stopping');

    expect($server->fresh()->status)->toBe('stopping');

    postJson(
        "/api/daemon/servers/{$server->id}/runtime",
        [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'version' => '0.1.0',
            'status' => 'restarting',
            'last_error' => null,
        ],
        ['Authorization' => 'Bearer daemon-secret'],
    )
        ->assertSuccessful()
        ->assertJsonPath('server.status', 'restarting');

    expect($server->fresh()->status)->toBe('restarting');
});

test('daemon cannot report runtime updates for a server on another node', function () {
    $server = daemonRuntimeServer();
    $otherNode = Node::factory()->create([
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440001',
    ]);
    NodeCredential::factory()->create([
        'daemon_secret_hash' => hash('sha256', 'other-daemon-secret'),
        'node_id' => $otherNode->id,
    ]);

    postJson(
        "/api/daemon/servers/{$server->id}/runtime",
        [
            'uuid' => '550e8400-e29b-41d4-a716-446655440001',
            'version' => '0.1.0',
            'status' => 'install_failed',
            'last_error' => 'Nope.',
        ],
        ['Authorization' => 'Bearer other-daemon-secret'],
    )
        ->assertUnprocessable()
        ->assertJson([
            'message' => 'The server does not belong to this node.',
        ]);
});
