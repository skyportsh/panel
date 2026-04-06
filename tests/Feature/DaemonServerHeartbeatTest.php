<?php

use App\Models\Cargo;
use App\Models\Location;
use App\Models\Node;
use App\Models\NodeCredential;
use App\Models\Server;
use App\Models\User;

use function Pest\Laravel\postJson;

it('ignores server statuses in daemon heartbeat payloads', function () {
    $location = Location::factory()->create();
    $node = Node::factory()->create([
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'location_id' => $location->id,
    ]);
    NodeCredential::factory()->create([
        'daemon_secret_hash' => hash('sha256', 'daemon-secret'),
        'node_id' => $node->id,
    ]);
    $cargo = Cargo::factory()->create();
    $user = User::factory()->create();
    $server = Server::factory()->create([
        'cargo_id' => $cargo->id,
        'node_id' => $node->id,
        'user_id' => $user->id,
        'status' => 'installing',
    ]);

    $response = postJson(
        '/api/daemon/heartbeat',
        [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'version' => '0.1.0',
            'servers' => [
                [
                    'id' => $server->id,
                    'status' => 'running',
                ],
            ],
        ],
        ['Authorization' => 'Bearer daemon-secret'],
    );

    $response->assertSuccessful();

    expect($server->fresh()->status)->toBe('installing');
});
