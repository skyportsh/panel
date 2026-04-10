<?php

use App\Models\Allocation;
use App\Models\Cargo;
use App\Models\Interconnect;
use App\Models\Location;
use App\Models\Node;
use App\Models\NodeCredential;
use App\Models\Server;
use App\Models\ServerUser;
use App\Models\User;
use App\Services\ServerConfigurationService;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\delete;
use function Pest\Laravel\get;
use function Pest\Laravel\post;

function interconnectTestDependencies(): array
{
    $location = Location::factory()->create();
    $node = Node::factory()->create([
        'daemon_port' => 2800,
        'fqdn' => 'node.example.com',
        'location_id' => $location->id,
        'use_ssl' => true,
    ]);
    $cargo = Cargo::factory()->create();

    NodeCredential::factory()->create([
        'daemon_callback_token' => 'callback-token',
        'node_id' => $node->id,
    ]);

    $user = User::factory()->create();
    $allocation = Allocation::factory()->create(['node_id' => $node->id]);

    $server = Server::factory()->create([
        'allocation_id' => $allocation->id,
        'cargo_id' => $cargo->id,
        'name' => 'Alpha',
        'node_id' => $node->id,
        'status' => 'running',
        'user_id' => $user->id,
    ]);

    $secondServer = Server::factory()->create([
        'allocation_id' => Allocation::factory()->create(['node_id' => $node->id])->id,
        'cargo_id' => $cargo->id,
        'name' => 'Beta',
        'node_id' => $node->id,
        'status' => 'offline',
        'user_id' => $user->id,
    ]);

    return [
        'node' => $node,
        'secondServer' => $secondServer,
        'server' => $server,
        'user' => $user,
    ];
}

test('server owner can view the interconnect page', function () {
    $deps = interconnectTestDependencies();

    actingAs($deps['user']);

    get("/server/{$deps['server']->id}/networking/interconnect")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('server/networking/interconnect')
            ->where('server.id', $deps['server']->id)
            ->has('interconnects', 0)
            ->has('eligibleServers', 2));
});

test('other users cannot view the interconnect page', function () {
    $deps = interconnectTestDependencies();

    actingAs(User::factory()->create());

    get("/server/{$deps['server']->id}/networking/interconnect")->assertForbidden();
});

test('server owner can create an interconnect', function () {
    $deps = interconnectTestDependencies();

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/networking/interconnect", [
        'name' => 'my-network',
    ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Interconnect created.');

    $ic = Interconnect::query()
        ->where('user_id', $deps['user']->id)
        ->where('node_id', $deps['node']->id)
        ->first();

    expect($ic)->not->toBeNull();
    expect($ic->name)->toBe('my-network');
    expect($ic->servers()->count())->toBe(1);
    expect($ic->servers()->first()->id)->toBe($deps['server']->id);
});

test('cannot create duplicate interconnect name on same node', function () {
    $deps = interconnectTestDependencies();

    Interconnect::factory()->create([
        'user_id' => $deps['user']->id,
        'node_id' => $deps['node']->id,
        'name' => 'my-network',
    ]);

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/networking/interconnect", [
        'name' => 'my-network',
    ])->assertSessionHasErrors('name');
});

test('interconnect name must be alphanumeric with dashes and underscores', function () {
    $deps = interconnectTestDependencies();

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/networking/interconnect", [
        'name' => 'invalid name!',
    ])->assertSessionHasErrors('name');
});

test('server owner can join an existing interconnect', function () {
    $deps = interconnectTestDependencies();
    $ic = Interconnect::factory()->create([
        'user_id' => $deps['user']->id,
        'node_id' => $deps['node']->id,
        'name' => 'shared-net',
    ]);
    $ic->servers()->attach($deps['secondServer']->id);

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/networking/interconnect/{$ic->id}/join")
        ->assertRedirect()
        ->assertSessionHas('success', 'Joined interconnect.');

    expect($ic->servers()->count())->toBe(2);
});

test('server owner can leave an interconnect', function () {
    $deps = interconnectTestDependencies();
    $ic = Interconnect::factory()->create([
        'user_id' => $deps['user']->id,
        'node_id' => $deps['node']->id,
        'name' => 'shared-net',
    ]);
    $ic->servers()->attach([$deps['server']->id, $deps['secondServer']->id]);

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/networking/interconnect/{$ic->id}/leave")
        ->assertRedirect()
        ->assertSessionHas('success', 'Left interconnect.');

    expect($ic->fresh()->servers()->count())->toBe(1);
});

test('leaving the last server deletes the interconnect', function () {
    $deps = interconnectTestDependencies();
    $ic = Interconnect::factory()->create([
        'user_id' => $deps['user']->id,
        'node_id' => $deps['node']->id,
        'name' => 'solo-net',
    ]);
    $ic->servers()->attach($deps['server']->id);

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/networking/interconnect/{$ic->id}/leave")
        ->assertRedirect()
        ->assertSessionHas('success', 'Left and deleted empty interconnect.');

    expect(Interconnect::query()->find($ic->id))->toBeNull();
});

test('server owner can add another server to an interconnect', function () {
    $deps = interconnectTestDependencies();
    $ic = Interconnect::factory()->create([
        'user_id' => $deps['user']->id,
        'node_id' => $deps['node']->id,
        'name' => 'shared-net',
    ]);
    $ic->servers()->attach($deps['server']->id);

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/networking/interconnect/{$ic->id}/add-server", [
        'server_id' => $deps['secondServer']->id,
    ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Beta added to interconnect.');

    expect($ic->servers()->count())->toBe(2);
});

test('cannot add a server from a different node', function () {
    $deps = interconnectTestDependencies();
    $ic = Interconnect::factory()->create([
        'user_id' => $deps['user']->id,
        'node_id' => $deps['node']->id,
        'name' => 'shared-net',
    ]);

    $otherNode = Node::factory()->create();
    $otherServer = Server::factory()->create([
        'allocation_id' => Allocation::factory()->create(['node_id' => $otherNode->id])->id,
        'cargo_id' => Cargo::factory()->create()->id,
        'node_id' => $otherNode->id,
        'user_id' => $deps['user']->id,
    ]);

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/networking/interconnect/{$ic->id}/add-server", [
        'server_id' => $otherServer->id,
    ])->assertUnprocessable();
});

test('server owner can remove a server from an interconnect', function () {
    $deps = interconnectTestDependencies();
    $ic = Interconnect::factory()->create([
        'user_id' => $deps['user']->id,
        'node_id' => $deps['node']->id,
        'name' => 'shared-net',
    ]);
    $ic->servers()->attach([$deps['server']->id, $deps['secondServer']->id]);

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/networking/interconnect/{$ic->id}/remove-server", [
        'server_id' => $deps['secondServer']->id,
    ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Server removed from interconnect.');

    expect($ic->fresh()->servers()->count())->toBe(1);
});

test('server owner can delete an interconnect', function () {
    $deps = interconnectTestDependencies();
    $ic = Interconnect::factory()->create([
        'user_id' => $deps['user']->id,
        'node_id' => $deps['node']->id,
        'name' => 'delete-me',
    ]);
    $ic->servers()->attach($deps['server']->id);

    actingAs($deps['user']);

    delete("/server/{$deps['server']->id}/networking/interconnect/{$ic->id}")
        ->assertRedirect()
        ->assertSessionHas('success', 'Interconnect deleted.');

    expect(Interconnect::query()->find($ic->id))->toBeNull();
});

test('admin can view and manage interconnects for any server', function () {
    $deps = interconnectTestDependencies();
    $admin = User::factory()->create(['is_admin' => true]);

    actingAs($admin);

    get("/server/{$deps['server']->id}/networking/interconnect")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('isOwner', false)
            ->where('canManage', true)
            ->has('eligibleServers', 2));

    post("/server/{$deps['server']->id}/networking/interconnect", [
        'name' => 'admin-net',
    ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Interconnect created.');
});

test('subuser can manage interconnects', function () {
    $deps = interconnectTestDependencies();
    $subuser = User::factory()->create();

    ServerUser::factory()->create([
        'server_id' => $deps['server']->id,
        'user_id' => $subuser->id,
        'permissions' => ['console'],
    ]);

    actingAs($subuser);

    get("/server/{$deps['server']->id}/networking/interconnect")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManage', true));

    post("/server/{$deps['server']->id}/networking/interconnect", [
        'name' => 'subuser-net',
    ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Interconnect created.');
});

test('unauthorized user cannot manage interconnects', function () {
    $deps = interconnectTestDependencies();
    $stranger = User::factory()->create();

    actingAs($stranger);

    get("/server/{$deps['server']->id}/networking/interconnect")->assertForbidden();
});

test('interconnects are included in server sync payload', function () {
    $deps = interconnectTestDependencies();
    $ic = Interconnect::factory()->create([
        'user_id' => $deps['user']->id,
        'node_id' => $deps['node']->id,
        'name' => 'sync-net',
    ]);
    $ic->servers()->attach($deps['server']->id);

    $service = app(ServerConfigurationService::class);
    $payload = $service->payload($deps['server']);

    expect($payload)->toHaveKey('interconnects');
    expect($payload['interconnects'])->toHaveCount(1);
    expect($payload['interconnects'][0]['name'])->toBe('sync-net');
});
