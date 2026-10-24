<?php

use App\Models\Allocation;
use App\Models\Cargo;
use App\Models\Location;
use App\Models\Node;
use App\Models\NodeCredential;
use App\Models\Server;
use App\Models\ServerUser;
use App\Models\User;
use App\Models\Workflow;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\delete;
use function Pest\Laravel\get;
use function Pest\Laravel\patch;
use function Pest\Laravel\post;

function workflowTestDependencies(): array
{
    $location = Location::factory()->create();
    $node = Node::factory()->create([
        'daemon_port' => 2800,
        'fqdn' => 'node.example.com',
        'location_id' => $location->id,
    ]);
    $cargo = Cargo::factory()->create();

    NodeCredential::factory()->create(['node_id' => $node->id]);

    $user = User::factory()->create();
    $server = Server::factory()->create([
        'allocation_id' => Allocation::factory()->create(['node_id' => $node->id])->id,
        'cargo_id' => $cargo->id,
        'node_id' => $node->id,
        'user_id' => $user->id,
    ]);

    return ['server' => $server, 'user' => $user];
}

test('server owner can view workflows page', function () {
    $deps = workflowTestDependencies();

    actingAs($deps['user']);

    get("/server/{$deps['server']->id}/workflows")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('server/workflows')
            ->has('workflows', 0));
});

test('administrator can view workflows page', function () {
    $deps = workflowTestDependencies();
    $admin = User::factory()->create(['is_admin' => true]);

    actingAs($admin);

    get("/server/{$deps['server']->id}/workflows")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('server/workflows')
            ->has('workflows', 0));
});

test('subuser with settings permission cannot access workflows', function () {
    $deps = workflowTestDependencies();
    $subuser = User::factory()->create();

    ServerUser::factory()->create([
        'server_id' => $deps['server']->id,
        'user_id' => $subuser->id,
        'permissions' => [ServerUser::PERMISSION_SETTINGS],
    ]);

    actingAs($subuser);

    get("/server/{$deps['server']->id}/workflows")
        ->assertForbidden();

    post("/server/{$deps['server']->id}/workflows", ['name' => 'Exploit Workflow'])
        ->assertForbidden();

    $workflow = Workflow::factory()->create(['server_id' => $deps['server']->id]);

    patch("/server/{$deps['server']->id}/workflows/{$workflow->id}", ['name' => 'Updated'])
        ->assertForbidden();

    delete("/server/{$deps['server']->id}/workflows/{$workflow->id}")
        ->assertForbidden();
});

test('subuser with console permission cannot access workflows', function () {
    $deps = workflowTestDependencies();
    $subuser = User::factory()->create();

    ServerUser::factory()->create([
        'server_id' => $deps['server']->id,
        'user_id' => $subuser->id,
        'permissions' => [ServerUser::PERMISSION_CONSOLE, ServerUser::PERMISSION_SETTINGS],
    ]);

    actingAs($subuser);

    get("/server/{$deps['server']->id}/workflows")->assertForbidden();
    post("/server/{$deps['server']->id}/workflows", ['name' => 'Exploit Workflow'])->assertForbidden();
});

test('server owner can create a workflow', function () {
    $deps = workflowTestDependencies();

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/workflows", ['name' => 'Auto Restart'])
        ->assertRedirect()
        ->assertSessionHas('success', 'Workflow created.');

    expect(Workflow::query()->where('server_id', $deps['server']->id)->count())->toBe(1);
});

test('administrator can create a workflow', function () {
    $deps = workflowTestDependencies();
    $admin = User::factory()->create(['is_admin' => true]);

    actingAs($admin);

    post("/server/{$deps['server']->id}/workflows", ['name' => 'Admin Workflow'])
        ->assertRedirect()
        ->assertSessionHas('success', 'Workflow created.');

    expect(Workflow::query()->where('server_id', $deps['server']->id)->count())->toBe(1);
});

test('server owner can update workflow nodes and edges', function () {
    $deps = workflowTestDependencies();
    $workflow = Workflow::factory()->create(['server_id' => $deps['server']->id]);

    actingAs($deps['user']);

    $nodes = [['id' => 'trigger-1', 'type' => 'trigger', 'position' => ['x' => 0, 'y' => 0], 'data' => ['triggerType' => 'schedule', 'interval' => '10']]];
    $edges = [];

    patch("/server/{$deps['server']->id}/workflows/{$workflow->id}", [
        'nodes' => $nodes,
        'edges' => $edges,
    ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Workflow saved.');

    $workflow->refresh();
    expect($workflow->nodes)->toHaveCount(1);
    expect($workflow->nodes[0]['data']['triggerType'])->toBe('schedule');
});

test('server owner can toggle workflow enabled state', function () {
    $deps = workflowTestDependencies();
    $workflow = Workflow::factory()->create(['server_id' => $deps['server']->id, 'enabled' => true]);

    actingAs($deps['user']);

    patch("/server/{$deps['server']->id}/workflows/{$workflow->id}", ['enabled' => false])
        ->assertRedirect();

    expect($workflow->fresh()->enabled)->toBeFalse();
});

test('server owner can delete a workflow', function () {
    $deps = workflowTestDependencies();
    $workflow = Workflow::factory()->create(['server_id' => $deps['server']->id]);

    actingAs($deps['user']);

    delete("/server/{$deps['server']->id}/workflows/{$workflow->id}")
        ->assertRedirect()
        ->assertSessionHas('success', 'Workflow deleted.');

    expect(Workflow::query()->find($workflow->id))->toBeNull();
});

test('other users cannot access workflows', function () {
    $deps = workflowTestDependencies();

    actingAs(User::factory()->create());

    get("/server/{$deps['server']->id}/workflows")->assertForbidden();
});
