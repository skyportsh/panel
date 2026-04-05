<?php

use App\Models\Location;
use App\Models\Node;
use App\Models\NodeCredential;
use App\Models\User;
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

    get('/admin/nodes')
        ->assertForbidden();
});

test('admin can access nodes page', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $location = Location::factory()->create();
    $node = Node::factory()->create(['location_id' => $location->id]);

    actingAs($admin);

    get('/admin/nodes')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/nodes')
            ->has('nodes.data', 1)
            ->where('nodes.data.0.name', $node->name)
            ->has('locations', 1)
            ->where('locations.0.name', $location->name)
            ->has('filters'),
        );
});

test('admin can search nodes', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $location = Location::factory()->create(['name' => 'Berlin']);
    Node::factory()->create(['location_id' => $location->id, 'name' => 'Berlin 01', 'fqdn' => 'berlin-01.example.com']);
    Node::factory()->create(['name' => 'Tokyo 01', 'fqdn' => 'tokyo-01.example.com']);

    actingAs($admin);

    get('/admin/nodes?search=Berlin')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('nodes.data', 1)
            ->where('nodes.data.0.name', 'Berlin 01'),
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
    ])
        ->assertRedirect();

    $node = Node::query()->where('name', 'Amsterdam 01')->first();

    expect($node)->not->toBeNull();
    expect($node?->location_id)->toBe($location->id);
    expect($node?->use_ssl)->toBeTrue();
});

test('admin can update a node', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $location = Location::factory()->create();
    $otherLocation = Location::factory()->create();
    $node = Node::factory()->create(['location_id' => $location->id]);

    actingAs($admin);

    patch("/admin/nodes/{$node->id}", [
        'name' => 'Updated Node',
        'location_id' => $otherLocation->id,
        'fqdn' => 'updated-node.example.com',
        'daemon_port' => 2900,
        'sftp_port' => 3228,
        'use_ssl' => false,
    ])
        ->assertRedirect();

    $node->refresh();

    expect($node->name)->toBe('Updated Node');
    expect($node->location_id)->toBe($otherLocation->id);
    expect($node->daemon_port)->toBe(2900);
    expect($node->sftp_port)->toBe(3228);
    expect($node->use_ssl)->toBeFalse();
});

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
        'last_seen_at' => now()->subMinute(),
        'location_id' => $location->id,
        'status' => 'online',
    ]);

    actingAs($admin);

    get('/admin/nodes')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('nodes.data.0.id', $node->id)
            ->where('nodes.data.0.connection_status', 'offline'),
        );
});

test('admin can delete a node', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $node = Node::factory()->create();

    actingAs($admin);

    delete("/admin/nodes/{$node->id}")
        ->assertRedirect();

    expect(Node::find($node->id))->toBeNull();
});

test('admin can bulk delete nodes', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $nodes = Node::factory()->count(2)->create();

    actingAs($admin);

    delete('/admin/nodes/bulk-destroy', [
        'ids' => $nodes->pluck('id')->all(),
    ])
        ->assertRedirect();

    expect(Node::whereIn('id', $nodes->pluck('id'))->count())->toBe(0);
});
