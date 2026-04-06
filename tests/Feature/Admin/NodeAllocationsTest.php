<?php

use App\Models\Allocation;
use App\Models\Location;
use App\Models\Node;
use App\Models\User;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\post;

it('admin can create a single allocation for a node', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $location = Location::factory()->create();
    $node = Node::factory()->create(['location_id' => $location->id, 'fqdn' => 'node.example.com']);

    actingAs($admin);

    post("/admin/nodes/{$node->id}/allocations", [
        'mode' => 'single',
        'bind_ip' => '0.0.0.0',
        'ip_alias' => '',
        'port' => 25565,
    ])->assertRedirect();

    $allocation = Allocation::query()->where('node_id', $node->id)->first();

    expect($allocation)->not->toBeNull();
    expect($allocation?->port)->toBe(25565);
    expect($allocation?->ip_alias)->toBe('node.example.com');
});

it('admin can create an allocation range for a node', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $location = Location::factory()->create();
    $node = Node::factory()->create(['location_id' => $location->id, 'fqdn' => 'node.example.com']);

    actingAs($admin);

    post("/admin/nodes/{$node->id}/allocations", [
        'mode' => 'range',
        'bind_ip' => '127.0.0.1',
        'ip_alias' => 'play.example.com',
        'start_port' => 25565,
        'end_port' => 25567,
    ])->assertRedirect();

    $ports = Allocation::query()->where('node_id', $node->id)->orderBy('port')->pluck('port')->all();

    expect($ports)->toBe([25565, 25566, 25567]);
    expect(Allocation::query()->where('node_id', $node->id)->value('ip_alias'))->toBe('play.example.com');
});
