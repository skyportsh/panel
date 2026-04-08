<?php

use App\Models\Allocation;
use App\Models\Cargo;
use App\Models\Location;
use App\Models\Node;
use App\Models\NodeCredential;
use App\Models\Server;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\deleteJson;
use function Pest\Laravel\get;
use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;
use function Pest\Laravel\putJson;

function serverFilesDependencies(): array
{
    $location = Location::factory()->create();
    $node = Node::factory()->create([
        'daemon_port' => 2800,
        'daemon_uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'fqdn' => 'node.example.com',
        'location_id' => $location->id,
        'use_ssl' => true,
    ]);
    $cargo = Cargo::factory()->create(['name' => 'Paper']);

    NodeCredential::factory()->create([
        'daemon_callback_token' => 'callback-token',
        'node_id' => $node->id,
    ]);

    $user = User::factory()->create();
    $server = Server::factory()->create([
        'allocation_id' => Allocation::factory()->create([
            'bind_ip' => '203.0.113.10',
            'ip_alias' => 'play.example.test',
            'node_id' => $node->id,
            'port' => 25565,
        ])->id,
        'cargo_id' => $cargo->id,
        'name' => 'Alpha',
        'node_id' => $node->id,
        'status' => 'offline',
        'user_id' => $user->id,
    ]);

    return [
        'server' => $server,
        'user' => $user,
    ];
}

test('server owner can view the files page', function () {
    Http::fake([
        'https://node.example.com:2800/api/daemon/servers/*/files*' => Http::response([
            'entries' => [
                [
                    'kind' => 'directory',
                    'last_modified_at' => 1_744_130_000,
                    'name' => 'plugins',
                    'path' => 'plugins',
                    'permissions' => '755',
                    'size_bytes' => null,
                ],
                [
                    'kind' => 'file',
                    'last_modified_at' => 1_744_130_100,
                    'name' => 'server.properties',
                    'path' => 'server.properties',
                    'permissions' => '644',
                    'size_bytes' => 128,
                ],
            ],
            'parent_path' => null,
            'path' => '',
        ]),
    ]);

    $dependencies = serverFilesDependencies();

    actingAs($dependencies['user']);

    get("/server/{$dependencies['server']->id}/files")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('server/files')
            ->where('server.id', $dependencies['server']->id)
            ->where('directory.path', '')
            ->has('directory.entries', 2)
            ->where('directory.entries.0.name', 'plugins')
            ->where('directory.entries.1.name', 'server.properties'));

    Http::assertSent(fn ($request) => $request->url() === "https://node.example.com:2800/api/daemon/servers/{$dependencies['server']->id}/files?panel_version=".rawurlencode((string) config('app.version')).'&path=&uuid=550e8400-e29b-41d4-a716-446655440000'
        && $request->hasHeader('Authorization', 'Bearer callback-token'));
});

test('files page shows daemon errors without crashing', function () {
    Http::fake([
        'https://node.example.com:2800/api/daemon/servers/*/files*' => Http::response([
            'message' => 'path must stay within the server volume',
        ], 422),
    ]);

    $dependencies = serverFilesDependencies();

    actingAs($dependencies['user']);

    get("/server/{$dependencies['server']->id}/files?path=../../etc")
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('directory', null)
            ->where('directoryError', 'path must stay within the server volume'));
});

test('server owner can open and save a file', function () {
    Http::fake([
        'https://node.example.com:2800/api/daemon/servers/*/files/contents*' => Http::sequence()
            ->push([
                'contents' => 'motd=Hello',
                'last_modified_at' => 1_744_130_200,
                'path' => 'server.properties',
                'permissions' => '644',
                'size_bytes' => 10,
            ])
            ->push([
                'message' => 'File saved successfully.',
                'ok' => true,
            ]),
    ]);

    $dependencies = serverFilesDependencies();

    actingAs($dependencies['user']);

    getJson("/api/client/servers/{$dependencies['server']->id}/files/contents?path=server.properties")
        ->assertOk()
        ->assertJsonPath('contents', 'motd=Hello');

    putJson("/api/client/servers/{$dependencies['server']->id}/files/contents", [
        'contents' => 'motd=Updated',
        'path' => 'server.properties',
    ])
        ->assertOk()
        ->assertJsonPath('message', 'File saved successfully.');
});

test('server owner can create files and directories', function () {
    Http::fake([
        'https://node.example.com:2800/api/daemon/servers/*/files/directories' => Http::response([
            'message' => 'Directory created successfully.',
            'ok' => true,
        ], 201),
        'https://node.example.com:2800/api/daemon/servers/*/files' => Http::response([
            'message' => 'File created successfully.',
            'ok' => true,
        ], 201),
    ]);

    $dependencies = serverFilesDependencies();

    actingAs($dependencies['user']);

    postJson("/api/client/servers/{$dependencies['server']->id}/files/directories", [
        'name' => 'plugins',
        'path' => '',
    ])
        ->assertCreated()
        ->assertJsonPath('message', 'Directory created successfully.');

    postJson("/api/client/servers/{$dependencies['server']->id}/files", [
        'name' => 'server.properties',
        'path' => '',
    ])
        ->assertCreated()
        ->assertJsonPath('message', 'File created successfully.');
});

test('server owner can delete files', function () {
    Http::fake([
        'https://node.example.com:2800/api/daemon/servers/*/files' => Http::response([
            'message' => 'Deleted 1 item.',
            'ok' => true,
        ]),
    ]);

    $dependencies = serverFilesDependencies();

    actingAs($dependencies['user']);

    deleteJson("/api/client/servers/{$dependencies['server']->id}/files", [
        'paths' => ['server.properties'],
    ])
        ->assertOk()
        ->assertJsonPath('message', 'Deleted 1 item.');
});

test('other users cannot access the files page', function () {
    $dependencies = serverFilesDependencies();

    actingAs(User::factory()->create());

    get("/server/{$dependencies['server']->id}/files")->assertForbidden();
});
