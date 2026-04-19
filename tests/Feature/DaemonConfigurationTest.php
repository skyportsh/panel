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
        'version' => config('app.version'),
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
            'configuration' => [
                'daemon_port',
                'fqdn',
                'location_country',
                'location_name',
                'name',
                'sftp_port',
                'updated_at',
                'use_ssl',
            ],
            'daemon_callback_token',
            'daemon_secret',
            'daemon_uuid',
            'heartbeat_interval_seconds',
            'node_id',
            'panel_time',
            'panel_version',
            'task_poll_interval_seconds',
        ]);

    expect($response->json('panel_version'))->toBe(config('app.version'));
    expect($response->json('daemon_callback_token'))->not->toBeEmpty();

    $node->refresh();

    expect($node->status)->toBe('online');
    expect($node->daemon_uuid)->toBe('550e8400-e29b-41d4-a716-446655440000');
    expect($node->daemon_version)->toBe(config('app.version'));
    expect($node->enrolled_at)->not->toBeNull();
});

test('panel assigns a new daemon uuid when default placeholder is used', function () {
    $node = Node::factory()->create();
    $issued = app(NodeConfigurationService::class)->issue($node);

    $response = postJson('/api/daemon/enroll', [
        'token' => $issued['token'],
        'uuid' => '00000000-0000-0000-0000-000000000000',
        'version' => config('app.version'),
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
        'version' => config('app.version'),
    ]);

    $response
        ->assertUnprocessable()
        ->assertJson([
            'message' => 'The enrollment token is invalid.',
        ]);
});

test('daemon enrollment rejects an incompatible daemon version', function () {
    $node = Node::factory()->create();
    $issued = app(NodeConfigurationService::class)->issue($node);

    $response = postJson('/api/daemon/enroll', [
        'token' => $issued['token'],
        'uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'version' => '9.9.9',
    ]);

    $response
        ->assertUnprocessable()
        ->assertJson([
            'message' => "This version of skyportd isn't compatible with Skyport panel ".config('app.version').'.',
        ]);
});

test('daemon heartbeat updates last seen time', function () {
    $node = Node::factory()->create();
    $issued = app(NodeConfigurationService::class)->issue($node);

    $configuration = postJson('/api/daemon/enroll', [
        'token' => $issued['token'],
        'uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'version' => config('app.version'),
    ])->assertCreated()->json();

    $response = postJson(
        '/api/daemon/heartbeat',
        [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'version' => config('app.version'),
        ],
        ['Authorization' => 'Bearer '.$configuration['daemon_secret']],
    );

    $response
        ->assertSuccessful()
        ->assertJson([
            'ok' => true,
            'configuration' => [
                'daemon_port' => $node->daemon_port,
                'fqdn' => $node->fqdn,
                'location_country' => $node->location->country,
                'location_name' => $node->location->name,
                'name' => $node->name,
                'sftp_port' => $node->sftp_port,
                'use_ssl' => $node->use_ssl,
            ],
        ]);

    expect($response->json('configuration.updated_at'))->not->toBeNull();

    $node->refresh();

    expect($node->daemon_version)->toBe(config('app.version'));
    expect($node->last_seen_at)->not->toBeNull();
});

test('daemon heartbeat rejects an incompatible daemon version', function () {
    $node = Node::factory()->create();
    $issued = app(NodeConfigurationService::class)->issue($node);

    $configuration = postJson('/api/daemon/enroll', [
        'token' => $issued['token'],
        'uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'version' => config('app.version'),
    ])->assertCreated()->json();

    $response = postJson(
        '/api/daemon/heartbeat',
        [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'version' => '9.9.9',
        ],
        ['Authorization' => 'Bearer '.$configuration['daemon_secret']],
    );

    $response
        ->assertUnprocessable()
        ->assertJson([
            'message' => "This version of skyportd isn't compatible with Skyport panel ".config('app.version').'.',
        ]);
});

test('daemon heartbeat rejects an invalid secret', function () {
    $response = postJson(
        '/api/daemon/heartbeat',
        [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'version' => config('app.version'),
        ],
        ['Authorization' => 'Bearer invalid-secret'],
    );

    $response
        ->assertUnprocessable()
        ->assertJson([
            'message' => 'The daemon secret is invalid.',
        ]);
});

test('daemon api routes are rate limited', function () {
    foreach (range(1, 300) as $attempt) {
        postJson(
            '/api/daemon/heartbeat',
            [
                'uuid' => '550e8400-e29b-41d4-a716-446655440000',
                'version' => config('app.version'),
            ],
            [
                'Authorization' => 'Bearer daemon-rate-limit-test',
            ],
        )->assertUnprocessable();
    }

    postJson(
        '/api/daemon/heartbeat',
        [
            'uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'version' => config('app.version'),
        ],
        [
            'Authorization' => 'Bearer daemon-rate-limit-test',
        ],
    )->assertTooManyRequests();
});
