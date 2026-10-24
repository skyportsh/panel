<?php

use App\Models\Allocation;
use App\Models\AppSetting;
use App\Models\Cargo;
use App\Models\Location;
use App\Models\Node;
use App\Models\NodeCredential;
use App\Models\Server;
use App\Models\User;
use App\Services\AppSettingsService;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\delete;
use function Pest\Laravel\get;
use function Pest\Laravel\patch;
use function Pest\Laravel\post;

function allocationTestDependencies(): array
{
    $location = Location::factory()->create();
    $node = Node::factory()->create([
        'daemon_port' => 2800,
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440000',
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
    $primaryAllocation = Allocation::factory()->create([
        'bind_ip' => '0.0.0.0',
        'ip_alias' => 'play.example.test',
        'node_id' => $node->id,
        'port' => 25565,
    ]);

    $server = Server::factory()->create([
        'allocation_id' => $primaryAllocation->id,
        'cargo_id' => $cargo->id,
        'name' => 'Alpha',
        'node_id' => $node->id,
        'status' => 'offline',
        'user_id' => $user->id,
    ]);

    $primaryAllocation->update(['server_id' => $server->id]);

    return [
        'node' => $node,
        'primaryAllocation' => $primaryAllocation,
        'server' => $server,
        'user' => $user,
    ];
}

function enableAllocations(int $limit = 5): void
{
    AppSetting::query()->updateOrCreate(
        ['key' => AppSettingsService::ALLOCATIONS_ENABLED_KEY],
        ['value' => '1'],
    );
    AppSetting::query()->updateOrCreate(
        ['key' => AppSettingsService::ALLOCATIONS_LIMIT_KEY],
        ['value' => (string) $limit],
    );
}

test('server owner can view the allocations page', function () {
    $deps = allocationTestDependencies();

    actingAs($deps['user']);

    get("/server/{$deps['server']->id}/networking/allocations")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('server/networking/allocations')
            ->where('server.id', $deps['server']->id)
            ->has('allocations', 1)
            ->where('allocations.0.is_primary', true)
            ->where('allocations.0.port', 25565));
});

test('admin can view allocations page for any server', function () {
    $deps = allocationTestDependencies();

    actingAs(User::factory()->create(['is_admin' => true]));

    get("/server/{$deps['server']->id}/networking/allocations")->assertOk();
});

test('other users cannot view the allocations page', function () {
    $deps = allocationTestDependencies();

    actingAs(User::factory()->create());

    get("/server/{$deps['server']->id}/networking/allocations")->assertForbidden();
});

test('server owner can add an allocation when enabled', function () {
    $deps = allocationTestDependencies();
    enableAllocations();

    // Create an unassigned allocation on the same node
    $available = Allocation::factory()->create([
        'node_id' => $deps['node']->id,
        'port' => 25566,
        'server_id' => null,
    ]);

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/networking/allocations")
        ->assertRedirect()
        ->assertSessionHas('success', 'Allocation added.');

    $available->refresh();
    expect($available->server_id)->toBe($deps['server']->id);
});

test('cannot add allocation when feature is disabled', function () {
    $deps = allocationTestDependencies();

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/networking/allocations")->assertForbidden();
});

test('cannot exceed allocation limit', function () {
    $deps = allocationTestDependencies();
    enableAllocations(1);

    // Already has one extra allocation
    Allocation::factory()->create([
        'node_id' => $deps['node']->id,
        'server_id' => $deps['server']->id,
        'port' => 25566,
    ]);

    // An available one exists on the node
    Allocation::factory()->create([
        'node_id' => $deps['node']->id,
        'server_id' => null,
        'port' => 25567,
    ]);

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/networking/allocations")->assertUnprocessable();
});

test('returns error when no available allocations on node', function () {
    $deps = allocationTestDependencies();
    enableAllocations();

    actingAs($deps['user']);

    post("/server/{$deps['server']->id}/networking/allocations")
        ->assertRedirect()
        ->assertSessionHasErrors('allocation');
});

test('server owner can change primary allocation', function () {
    Http::fake([
        'https://node.example.com:2800/api/daemon/servers/sync' => Http::response(['ok' => true]),
    ]);

    $deps = allocationTestDependencies();
    $secondAllocation = Allocation::factory()->create([
        'node_id' => $deps['node']->id,
        'server_id' => $deps['server']->id,
        'port' => 25566,
    ]);

    actingAs($deps['user']);

    patch("/server/{$deps['server']->id}/networking/allocations/primary", [
        'allocation_id' => $secondAllocation->id,
    ])
        ->assertRedirect()
        ->assertSessionHas('success', 'Primary allocation updated. skyportd saved the new server state.');

    $deps['server']->refresh();
    expect($deps['server']->allocation_id)->toBe($secondAllocation->id);

    Http::assertSent(fn ($request) => $request->url() === 'https://node.example.com:2800/api/daemon/servers/sync'
        && $request['server']['allocation']['port'] === 25566);
});

test('changing primary preserves the old primary allocation', function () {
    Http::fake([
        'https://node.example.com:2800/api/daemon/servers/sync' => Http::response(['ok' => true]),
    ]);

    $deps = allocationTestDependencies();

    // Old primary has no server_id (simulates pre-migration data)
    $deps['primaryAllocation']->update(['server_id' => null]);

    $secondAllocation = Allocation::factory()->create([
        'node_id' => $deps['node']->id,
        'server_id' => $deps['server']->id,
        'port' => 25566,
    ]);

    actingAs($deps['user']);

    patch("/server/{$deps['server']->id}/networking/allocations/primary", [
        'allocation_id' => $secondAllocation->id,
    ])->assertRedirect();

    // The old primary should now have server_id stamped
    $deps['primaryAllocation']->refresh();
    expect($deps['primaryAllocation']->server_id)->toBe($deps['server']->id);

    // Both allocations should appear on the page
    get("/server/{$deps['server']->id}/networking/allocations")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('allocations', 2));
});

test('cannot set primary to allocation not belonging to server', function () {
    $deps = allocationTestDependencies();
    $otherAllocation = Allocation::factory()->create([
        'node_id' => $deps['node']->id,
        'port' => 30000,
    ]);

    actingAs($deps['user']);

    patch("/server/{$deps['server']->id}/networking/allocations/primary", [
        'allocation_id' => $otherAllocation->id,
    ])->assertUnprocessable();
});

test('server owner can release a non-primary allocation', function () {
    $deps = allocationTestDependencies();
    $secondAllocation = Allocation::factory()->create([
        'node_id' => $deps['node']->id,
        'server_id' => $deps['server']->id,
        'port' => 25566,
    ]);

    actingAs($deps['user']);

    delete("/server/{$deps['server']->id}/networking/allocations/{$secondAllocation->id}")
        ->assertRedirect()
        ->assertSessionHas('success', 'Allocation released.');

    $secondAllocation->refresh();
    expect($secondAllocation->server_id)->toBeNull()
        ->and(Allocation::query()->find($secondAllocation->id))->not->toBeNull();
});

test('cannot delete the primary allocation', function () {
    $deps = allocationTestDependencies();

    actingAs($deps['user']);

    delete("/server/{$deps['server']->id}/networking/allocations/{$deps['primaryAllocation']->id}")
        ->assertUnprocessable();
});

test('cannot delete allocation belonging to another server', function () {
    $deps = allocationTestDependencies();
    $otherAllocation = Allocation::factory()->create([
        'node_id' => $deps['node']->id,
        'port' => 30000,
    ]);

    actingAs($deps['user']);

    delete("/server/{$deps['server']->id}/networking/allocations/{$otherAllocation->id}")
        ->assertUnprocessable();
});
