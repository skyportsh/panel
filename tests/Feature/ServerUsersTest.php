<?php

use App\Models\Allocation;
use App\Models\Cargo;
use App\Models\Location;
use App\Models\Node;
use App\Models\NodeCredential;
use App\Models\Server;
use App\Models\ServerUser;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\delete;
use function Pest\Laravel\get;
use function Pest\Laravel\patch;
use function Pest\Laravel\post;

function serverUsersTestDependencies(): array
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

    return [
        'server' => $server,
        'user' => $user,
    ];
}

test('server owner can view the users page', function () {
    $deps = serverUsersTestDependencies();

    actingAs($deps['user']);

    get("/server/{$deps['server']->id}/users")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('server/users')
            ->where('isOwner', true)
            ->has('subusers', 0)
            ->has('availablePermissions', 7));
});

test('other users cannot view the users page', function () {
    $deps = serverUsersTestDependencies();

    actingAs(User::factory()->create());

    get("/server/{$deps['server']->id}/users")->assertForbidden();
});

test('subuser can view the users page', function () {
    $deps = serverUsersTestDependencies();
    $subuser = User::factory()->create();

    ServerUser::factory()->create([
        'server_id' => $deps['server']->id,
        'user_id' => $subuser->id,
        'permissions' => ['console', 'users'],
    ]);

    actingAs($subuser);

    get("/server/{$deps['server']->id}/users")->assertOk();
});

test('server owner can add a subuser', function () {
    $deps = serverUsersTestDependencies();
    $newUser = User::factory()->create(['email' => 'new@example.com']);

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/users", [
        'email' => 'new@example.com',
        'permissions' => ['console', 'files'],
    ])
        ->assertRedirect()
        ->assertSessionHas('success');

    $su = ServerUser::query()
        ->where('server_id', $deps['server']->id)
        ->where('user_id', $newUser->id)
        ->first();

    expect($su)->not->toBeNull();
    expect($su->permissionList())->toBe(['console', 'files']);
});

test('cannot add yourself as a subuser', function () {
    $deps = serverUsersTestDependencies();

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/users", [
        'email' => $deps['user']->email,
        'permissions' => ['console'],
    ])->assertSessionHasErrors('email');
});

test('cannot add a user who already has access', function () {
    $deps = serverUsersTestDependencies();
    $existing = User::factory()->create();

    ServerUser::factory()->create([
        'server_id' => $deps['server']->id,
        'user_id' => $existing->id,
    ]);

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/users", [
        'email' => $existing->email,
        'permissions' => ['console'],
    ])->assertSessionHasErrors('email');
});

test('cannot add a user with an unknown email', function () {
    $deps = serverUsersTestDependencies();

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/users", [
        'email' => 'nonexistent@example.com',
        'permissions' => ['console'],
    ])->assertSessionHasErrors('email');
});

test('server owner can update permissions', function () {
    $deps = serverUsersTestDependencies();
    $subuser = User::factory()->create();

    $su = ServerUser::factory()->create([
        'server_id' => $deps['server']->id,
        'user_id' => $subuser->id,
        'permissions' => ['console'],
    ]);

    actingAs($deps['user']);

    patch("/server/{$deps['server']->id}/users/{$su->id}", [
        'permissions' => ['console', 'files', 'power'],
    ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Permissions updated.');

    $su->refresh();
    expect($su->permissionList())->toBe(['console', 'files', 'power']);
});

test('server owner can remove a subuser', function () {
    $deps = serverUsersTestDependencies();
    $subuser = User::factory()->create();

    $su = ServerUser::factory()->create([
        'server_id' => $deps['server']->id,
        'user_id' => $subuser->id,
    ]);

    actingAs($deps['user']);

    delete("/server/{$deps['server']->id}/users/{$su->id}")
        ->assertRedirect()
        ->assertSessionHas('success', 'User removed from this server.');

    expect(ServerUser::query()->find($su->id))->toBeNull();
});

test('admin can add subusers to any server', function () {
    $deps = serverUsersTestDependencies();
    $admin = User::factory()->create(['is_admin' => true]);
    $newUser = User::factory()->create(['email' => 'admin-added@example.com']);

    actingAs($admin);

    post("/server/{$deps['server']->id}/users", [
        'email' => 'admin-added@example.com',
        'permissions' => ['console'],
    ])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect(ServerUser::query()
        ->where('server_id', $deps['server']->id)
        ->where('user_id', $newUser->id)
        ->exists())->toBeTrue();

    get("/server/{$deps['server']->id}/users")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('canManage', true));
});

test('must select at least one permission', function () {
    $deps = serverUsersTestDependencies();
    $newUser = User::factory()->create();

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/users", [
        'email' => $newUser->email,
        'permissions' => [],
    ])->assertSessionHasErrors('permissions');
});
