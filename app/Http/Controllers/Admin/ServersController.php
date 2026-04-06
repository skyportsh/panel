<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreServerRequest;
use App\Http\Requests\Admin\UpdateServerRequest;
use App\Models\Cargo;
use App\Models\Node;
use App\Models\Server;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ServersController extends Controller
{
    public function index(Request $request): Response
    {
        $servers = Server::query()
            ->with(['cargo:id,name', 'node:id,name', 'user:id,name,email'])
            ->when($request->input('search'), function ($query, string $search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($userQuery) => $userQuery
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"))
                        ->orWhereHas('node', fn ($nodeQuery) => $nodeQuery
                            ->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('cargo', fn ($cargoQuery) => $cargoQuery
                            ->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('updated_at')
            ->paginate(10)
            ->through(fn (Server $server): array => [
                'cargo' => [
                    'id' => $server->cargo->id,
                    'name' => $server->cargo->name,
                ],
                'cpu_limit' => $server->cpu_limit,
                'created_at' => $server->created_at?->toIso8601String(),
                'disk_mib' => $server->disk_mib,
                'id' => $server->id,
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
            ])
            ->withQueryString();

        return Inertia::render('admin/servers', [
            'servers' => $servers,
            'filters' => [
                'search' => $request->input('search', ''),
            ],
            'users' => User::query()
                ->select('id', 'name', 'email')
                ->orderBy('name')
                ->get()
                ->map(fn (User $user): array => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ])
                ->all(),
            'nodes' => Node::query()
                ->select('id', 'name')
                ->orderBy('name')
                ->get()
                ->map(fn (Node $node): array => [
                    'id' => $node->id,
                    'name' => $node->name,
                ])
                ->all(),
            'cargo' => Cargo::query()
                ->select('id', 'name')
                ->orderBy('name')
                ->get()
                ->map(fn (Cargo $cargo): array => [
                    'id' => $cargo->id,
                    'name' => $cargo->name,
                ])
                ->all(),
        ]);
    }

    public function store(StoreServerRequest $request): RedirectResponse
    {
        Server::create($request->validated() + ['status' => 'pending']);

        return back()->with('success', 'Server created.');
    }

    public function update(UpdateServerRequest $request, Server $server): RedirectResponse
    {
        $server->update($request->validated());

        return back()->with('success', 'Server updated.');
    }

    public function destroy(Server $server): RedirectResponse
    {
        $server->delete();

        return back()->with('success', 'Server deleted.');
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'exists:servers,id'],
        ]);

        $ids = $validated['ids'];
        $count = count($ids);

        Server::query()->whereIn('id', $ids)->delete();

        return back()->with('success', $count.' '.str('server')->plural($count).' deleted.');
    }
}
