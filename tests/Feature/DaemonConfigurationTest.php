<?php

use App\Models\Node;
use App\Services\NodeConfigurationService;

use function Pest\Laravel\postJson;

test('daemon can enroll with a valid token', function () {
    $node = Node::factory()->create();
    $issued = app(NodeConfigurationService::class)->issue($node);

    $response = postJson('/api/daemon/enroll', [
        'token' => $issued['token'],
        'uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'version' => '0.1.0',
        'hostname' => 'node-ams-01',
        'reported_ip' => '127.0.0.1',
        'os' => 'linux',
        'arch' => 'x86_64',
        'capabilities' => [
            'docker' => true,
            'metrics' => true,
        ],
        'docker' => [
            'version' => '28.0.1',
        ],
    ]);

    $response
        ->assertCreated()
        ->assertJsonStructure([
            'daemon_secret',
            'daemon_uuid',
            'heartbeat_interval_seconds',
            'node_id',
            'panel_time',
            'task_poll_interval_seconds',
        ]);

    $node->refresh();

    expect($node->status)->toBe('online');
    expect($node->daemon_uuid)->toBe('550e8400-e29b-41d4-a716-446655440000');
    expect($node->daemon_version)->toBe('0.1.0');
    expect($node->enrolled_at)->not->toBeNull();
});

test('panel assigns a new daemon uuid when default placeholder is used', function () {
    $node = Node::factory()->create();
    $issued = app(NodeConfigurationService::class)->issue($node);

    $response = postJson('/api/daemon/enroll', [
        'token' => $issued['token'],
        'uuid' => '00000000-0000-0000-0000-000000000000',
        'version' => '0.1.0',
    ]);

    $response
        ->assertCreated()
        ->assertJsonStructure(['daemon_uuid']);

    $assignedUuid = $response->json('daemon_uuid');

    expect($assignedUuid)->not->toBe('00000000-0000-0000-0000-000000000000');

    $node->refresh();

    expect($node->daemon_uuid)->toBe($assignedUuid);
});

test('daemon cannot enroll with an invalid token', function () {
    $response = postJson('/api/daemon/enroll', [
        'token' => 'invalid-token',
        'uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'version' => '0.1.0',
    ]);

    $response
        ->assertUnprocessable()
        ->assertJson([
            'message' => 'The enrollment token is invalid.',
        ]);
});

test('daemon heartbeat updates last seen time', function () {
    $node = Node::factory()->create();
    $issued = app(NodeConfigurationService::class)->issue($node);

    $configuration = postJson('/api/daemon/enroll', [
        'token' => $issued['token'],
        'uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'version' => '0.1.0',
    ])->assertCreated()->json();

    $response = postJson(
        '/api/daemon/heartbeat',
        [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'version' => '0.1.1',
        ],
        ['Authorization' => 'Bearer '.$configuration['daemon_secret']],
    );

    $response
        ->assertSuccessful()
        ->assertJson([
            'ok' => true,
        ]);

    $node->refresh();

    expect($node->daemon_version)->toBe('0.1.1');
    expect($node->last_seen_at)->not->toBeNull();
});

test('daemon heartbeat rejects an invalid secret', function () {
    $response = postJson(
        '/api/daemon/heartbeat',
        [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'version' => '0.1.0',
        ],
        ['Authorization' => 'Bearer invalid-secret'],
    );

    $response
        ->assertUnprocessable()
        ->assertJson([
            'message' => 'The daemon secret is invalid.',
        ]);
});
