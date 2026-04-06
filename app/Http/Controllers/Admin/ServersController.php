<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreServerRequest;
use App\Http\Requests\Admin\UpdateServerRequest;
use App\Models\Allocation;
use App\Models\Cargo;
use App\Models\Node;
use App\Models\Server;
use App\Models\User;
use App\Services\ServerRemoteUpdateService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ServersController extends Controller
{
    public function __construct(
        private ServerRemoteUpdateService $serverRemoteUpdateService,
    ) {}

    public function index(Request $request): Response
    {
        $servers = $this->serversPaginator($request);

        return Inertia::render('admin/servers', [
            'servers' => $servers,
            'filters' => [
                'search' => $request->input('search', ''),
            ],
            'users' => User::query()
                ->select('id', 'name', 'email')
                ->orderBy('name')
                ->get()
                ->map(
                    fn (User $user): array => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                    ],
                )
                ->all(),
            'nodes' => Node::query()
                ->select('id', 'name')
                ->orderBy('name')
                ->get()
                ->map(
                    fn (Node $node): array => [
                        'id' => $node->id,
                        'name' => $node->name,
                    ],
                )
                ->all(),
            'allocations' => $this->allocationOptions(),
            'cargo' => Cargo::query()
                ->select('id', 'name')
                ->orderBy('name')
                ->get()
                ->map(
                    fn (Cargo $cargo): array => [
                        'id' => $cargo->id,
                        'name' => $cargo->name,
                    ],
                )
                ->all(),
        ]);
    }

    protected function serversPaginator(Request $request): LengthAwarePaginator
    {
        if (! Schema::hasTable('servers') || ! Schema::hasTable('allocations')) {
            return $this->emptyServersPaginator($request);
        }

        return Server::query()
            ->with([
                'allocation:id,node_id,bind_ip,port,ip_alias',
                'cargo:id,name',
                'node:id,name',
                'user:id,name,email',
            ])
            ->when($request->input('search'), function (
                $query,
                string $search,
            ) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhereHas(
                            'user',
                            fn ($userQuery) => $userQuery
                                ->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%"),
                        )
                        ->orWhereHas(
                            'node',
                            fn ($nodeQuery) => $nodeQuery->where(
                                'name',
                                'like',
                                "%{$search}%",
                            ),
                        )
                        ->orWhereHas(
                            'cargo',
                            fn ($cargoQuery) => $cargoQuery->where(
                                'name',
                                'like',
                                "%{$search}%",
                            ),
                        );
                });
            })
            ->orderByDesc('updated_at')
            ->paginate(10)
            ->through(
                fn (Server $server): array => [
                    'allocation' => [
                        'bind_ip' => $server->allocation->bind_ip,
                        'id' => $server->allocation->id,
                        'ip_alias' => $server->allocation->ip_alias,
                        'port' => $server->allocation->port,
                    ],
                    'cargo' => [
                        'id' => $server->cargo->id,
                        'name' => $server->cargo->name,
                    ],
                    'cpu_limit' => $server->cpu_limit,
                    'created_at' => $server->created_at?->toIso8601String(),
                    'disk_mib' => $server->disk_mib,
                    'id' => $server->id,
                    'last_error' => $server->last_error,
                    'memory_mib' => $server->memory_mib,
                    'name' => $server->name,
                    'node' => [
                        'id' => $server->node->id,
                        'name' => $server->node->name,
                    ],
                    'status' => $server->status,
                    'updated_at' => $server->updated_at?->toIso8601String(),
                    'user' => [
                        'email' => $server->user->email,
                        'id' => $server->user->id,
                        'name' => $server->user->name,
                    ],
                ],
            )
            ->withQueryString();
    }

    protected function emptyServersPaginator(Request $request): LengthAwarePaginator
    {
        return (new LengthAwarePaginator(
            items: [],
            total: 0,
            perPage: 10,
            currentPage: $request->integer('page', 1),
        ))->withQueryString();
    }

    /**
     * @return array<int, array{bind_ip: string, id: int, ip_alias: ?string, node_id: int, port: int, server_id: ?int}>
     */
    protected function allocationOptions(): array
    {
        if (! Schema::hasTable('allocations')) {
            return [];
        }

        return Allocation::query()
            ->with('server:id,allocation_id')
            ->orderBy('port')
            ->get()
            ->map(
                fn (Allocation $allocation): array => [
                    'bind_ip' => $allocation->bind_ip,
                    'id' => $allocation->id,
                    'ip_alias' => $allocation->ip_alias,
                    'node_id' => $allocation->node_id,
                    'port' => $allocation->port,
                    'server_id' => $allocation->server?->id,
                ],
            )
            ->all();
    }

    public function store(StoreServerRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $this->ensureAllocationIsAvailable(
            (int) $validated['allocation_id'],
            (int) $validated['node_id'],
        );

        $server = Server::query()->create($validated + ['status' => 'installing']);
        $server->loadMissing(['cargo', 'node.credential', 'user']);

        if ($this->serverRemoteUpdateService->push($server)) {
            return Redirect::back()->with(
                'success',
                'Server created. skyportd saved the server state.',
            );
        }

        return Redirect::back()
            ->with('success', 'Server created.')
            ->with(
                'warning',
                'skyportd could not be updated automatically. This server will need to be synced later.',
            );
    }

    public function update(
        UpdateServerRequest $request,
        Server $server,
    ): RedirectResponse {
        $server->loadMissing(['cargo', 'node.credential', 'user']);
        $targetServer = clone $server;
        $validated = $request->validated();
        $this->ensureAllocationIsAvailable(
            (int) $validated['allocation_id'],
            (int) $validated['node_id'],
            $server,
        );

        $server->update($validated);
        $server->refresh()->loadMissing(['cargo', 'node.credential', 'user']);

        $synced = $this->serverRemoteUpdateService->push(
            $targetServer,
            $server,
        );

        if ($synced) {
            return Redirect::back()->with(
                'success',
                'Server updated. skyportd saved the new server state.',
            );
        }

        return Redirect::back()
            ->with('success', 'Server updated.')
            ->with(
                'warning',
                'skyportd could not be updated automatically. This server will need to be synced later.',
            );
    }

    public function destroy(Server $server): RedirectResponse
    {
        $server->loadMissing(['node.credential']);
        $deletedRemotely = $this->serverRemoteUpdateService->delete($server);

        $server->delete();

        if ($deletedRemotely) {
            return Redirect::back()->with(
                'success',
                'Server deleted. skyportd removed the server state.',
            );
        }

        return Redirect::back()
            ->with('success', 'Server deleted.')
            ->with(
                'warning',
                'skyportd could not be updated automatically. This server may still exist on the node until it is reconciled.',
            );
    }

    public function downloadInstallLog(
        Server $server,
    ): StreamedResponse|RedirectResponse {
        $payload = $this->serverRemoteUpdateService->downloadInstallLog(
            $server,
        );

        if (! $payload) {
            return Redirect::back()->with(
                'warning',
                'skyportd could not provide the install log for this server.',
            );
        }

        return response()->streamDownload(
            function () use ($payload): void {
                echo $payload['contents'];
            },
            $payload['filename'],
            [
                'Content-Type' => $payload['content_type'],
            ],
        );
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'exists:servers,id'],
        ]);

        $ids = $validated['ids'];
        $count = count($ids);
        $remoteFailures = 0;

        Server::query()
            ->with(['node.credential'])
            ->whereIn('id', $ids)
            ->get()
            ->each(function (Server $server) use (&$remoteFailures): void {
                if (! $this->serverRemoteUpdateService->delete($server)) {
                    $remoteFailures++;
                }

                $server->delete();
            });

        $response = Redirect::back()->with(
            'success',
            $count.' '.Str::plural('server', $count).' deleted.',
        );

        if ($remoteFailures > 0) {
            return $response->with(
                'warning',
                'Some servers could not be removed from skyportd automatically.',
            );
        }

        return $response;
    }

    private function ensureAllocationIsAvailable(
        int $allocationId,
        int $nodeId,
        ?Server $server = null,
    ): void {
        $allocation = Allocation::query()
            ->with('server:id,allocation_id')
            ->findOrFail($allocationId);

        abort_if(
            $allocation->node_id !== $nodeId,
            422,
            'The selected allocation does not belong to the selected node.',
        );
        abort_if(
            $allocation->server && $allocation->server->id !== $server?->id,
            422,
            'The selected allocation is already assigned to another server.',
        );
    }
}
