<?php

use App\Models\Location;
use App\Models\Node;
use App\Models\NodeCredential;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\delete;
use function Pest\Laravel\get;
use function Pest\Laravel\patch;
use function Pest\Laravel\post;
use function Pest\Laravel\postJson;

test('non-admin cannot access admin nodes page', function () {
    $user = User::factory()->create(['is_admin' => false]);

    actingAs($user);

    get('/admin/nodes')->assertForbidden();
});

test('admin can access nodes page', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $location = Location::factory()->create();
    $node = Node::factory()->create([
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'daemon_version' => config('app.version'),
        'last_seen_at' => now(),
        'location_id' => $location->id,
        'status' => 'online',
    ]);

    actingAs($admin);

    $response = get('/admin/nodes')->assertOk();

    assertInertiaPage(
        $response,
        fn (Assert $page) => $page
            ->component('admin/nodes')
            ->has('nodes.data', 1)
            ->where('nodes.data.0.name', $node->name)
            ->where('nodes.data.0.daemon_version', config('app.version'))
            ->where('nodes.data.0.connection_status', 'online')
            ->where(
                'nodes.data.0.last_seen_at',
                $node->last_seen_at?->toIso8601String(),
            )
            ->has('locations', 1)
            ->where('locations.0.name', $location->name)
            ->has('filters'),
    );
});

test('admin can search nodes', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $location = Location::factory()->create(['name' => 'Berlin']);
    Node::factory()->create([
        'location_id' => $location->id,
        'name' => 'Berlin 01',
        'fqdn' => 'berlin-01.example.com',
    ]);
    Node::factory()->create([
        'name' => 'Tokyo 01',
        'fqdn' => 'tokyo-01.example.com',
    ]);

    actingAs($admin);

    $response = get('/admin/nodes?search=Berlin')->assertOk();

    assertInertiaPage(
        $response,
        fn (Assert $page) => $page
            ->has('nodes.data', 1)
            ->where('nodes.data.0.name', 'Berlin 01'),
    );
});

test('admin nodes page paginates results', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $location = Location::factory()->create();

    foreach (range(1, 11) as $number) {
        Node::factory()->create([
            'location_id' => $location->id,
            'name' => "Node {$number}",
            'updated_at' => now()->subMinutes(20 - $number),
        ]);
    }

    actingAs($admin);

    $response = get('/admin/nodes?page=2')->assertOk();

    assertInertiaPage(
        $response,
        fn (Assert $page) => $page
            ->where('nodes.current_page', 2)
            ->where('nodes.last_page', 2)
            ->where('nodes.total', 11)
            ->has('nodes.data', 1)
            ->where('nodes.data.0.name', 'Node 1'),
    );
});

test('admin can create a node', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $location = Location::factory()->create();

    actingAs($admin);

    post('/admin/nodes', [
        'name' => 'Amsterdam 01',
        'location_id' => $location->id,
        'fqdn' => 'amsterdam-01.example.com',
        'daemon_port' => 2800,
        'sftp_port' => 3128,
        'use_ssl' => true,
    ])->assertRedirect();

    $node = Node::query()->where('name', 'Amsterdam 01')->first();

    expect($node)->not->toBeNull();
    expect($node?->location_id)->toBe($location->id);
    expect($node?->use_ssl)->toBeTrue();
});

test(
    'admin can update a node and push the new config to skyportd',
    function () {
        Http::fake([
            'http://node-01.example.com:2800/api/daemon/configuration/sync' => Http::response(
                [
                    'ok' => true,
                ],
            ),
        ]);

        $admin = User::factory()->create(['is_admin' => true]);
        $location = Location::factory()->create();
        $otherLocation = Location::factory()->create();
        $node = Node::factory()->create([
            'daemon_port' => 2800,
            'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'fqdn' => 'node-01.example.com',
            'location_id' => $location->id,
            'status' => 'online',
            'use_ssl' => false,
        ]);
        NodeCredential::factory()->create([
            'daemon_callback_token' => 'callback-token',
            'node_id' => $node->id,
        ]);

        actingAs($admin);

        patch("/admin/nodes/{$node->id}", [
            'name' => 'Updated Node',
            'location_id' => $otherLocation->id,
            'fqdn' => 'node-01.example.com',
            'daemon_port' => 2900,
            'sftp_port' => 3228,
            'use_ssl' => false,
        ])
            ->assertRedirect()
            ->assertSessionHas(
                'success',
                'Node updated. skyportd applied the new configuration.',
            );

        Http::assertSent(function ($request) {
            return $request->url() ===
                'http://node-01.example.com:2800/api/daemon/configuration/sync' &&
                $request->hasHeader('Authorization', 'Bearer callback-token') &&
                $request['daemon_port'] === 2900 &&
                $request['sftp_port'] === 3228;
        });

        $node->refresh();

        expect($node->name)->toBe('Updated Node');
        expect($node->location_id)->toBe($otherLocation->id);
        expect($node->daemon_port)->toBe(2900);
        expect($node->sftp_port)->toBe(3228);
        expect($node->use_ssl)->toBeFalse();
    },
);

test(
    'admin update warns when skyportd could not be updated automatically',
    function () {
        Http::fake([
            '*' => Http::response([], 500),
        ]);

        $admin = User::factory()->create(['is_admin' => true]);
        $location = Location::factory()->create();
        $node = Node::factory()->create([
            'daemon_port' => 2800,
            'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440000',
            'fqdn' => 'node-01.example.com',
            'location_id' => $location->id,
            'status' => 'online',
            'use_ssl' => false,
        ]);
        NodeCredential::factory()->create([
            'daemon_callback_token' => 'callback-token',
            'node_id' => $node->id,
        ]);

        actingAs($admin);

        patch("/admin/nodes/{$node->id}", [
            'name' => 'Updated Node',
            'location_id' => $location->id,
            'fqdn' => 'node-01.example.com',
            'daemon_port' => 2900,
            'sftp_port' => 3228,
            'use_ssl' => false,
        ])
            ->assertRedirect()
            ->assertSessionHas('success', 'Node updated.')
            ->assertSessionHas(
                'warning',
                'skyportd could not be updated automatically. This node will need to be reconfigured.',
            );
    },
);

test('admin can generate a configuration token', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $node = Node::factory()->create();

    actingAs($admin);

    $response = postJson("/admin/nodes/{$node->id}/configure-token");

    $response
        ->assertSuccessful()
        ->assertJsonStructure(['token', 'expires_at', 'status']);

    $node->refresh();
    $credential = NodeCredential::query()->where('node_id', $node->id)->first();

    expect($node->status)->toBe('configured');
    expect($credential)->not->toBeNull();
    expect($credential?->enrollment_token_hash)->not->toBeNull();
    expect($credential?->enrollment_used_at)->toBeNull();
});

test('admin nodes page shows derived connection status', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $location = Location::factory()->create();
    $node = Node::factory()->create([
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'last_seen_at' => now()->subMinutes(3),
        'location_id' => $location->id,
        'status' => 'online',
    ]);

    actingAs($admin);

    $response = get('/admin/nodes')->assertOk();

    assertInertiaPage(
        $response,
        fn (Assert $page) => $page
            ->where('nodes.data.0.id', $node->id)
            ->where('nodes.data.0.connection_status', 'offline'),
    );
});

test('admin can delete a node', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $node = Node::factory()->create();

    actingAs($admin);

    delete("/admin/nodes/{$node->id}")->assertRedirect();

    expect(Node::query()->find($node->id))->toBeNull();
});

test('admin can bulk delete nodes', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $nodes = Node::factory()->count(2)->create();

    actingAs($admin);

    delete('/admin/nodes/bulk-destroy', [
        'ids' => $nodes->pluck('id')->all(),
    ])->assertRedirect();

    expect(Node::query()->whereIn('id', $nodes->pluck('id'))->count())->toBe(0);
});
