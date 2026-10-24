<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Client\Concerns\AuthorizesServerAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\Client\UpdateServerPrimaryAllocationRequest;
use App\Models\Allocation;
use App\Models\Server;
use App\Models\ServerUser;
use App\Services\AppSettingsService;
use App\Services\ServerRemoteUpdateService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ServerAllocationsController extends Controller
{
    use AuthorizesServerAccess;

    public function __construct(
        private AppSettingsService $appSettingsService,
        private ServerRemoteUpdateService $serverRemoteUpdateService,
    ) {}

    public function index(Request $request, Server $server): Response
    {
        $this->authorizeServerAccess($request, $server, ServerUser::PERMISSION_ALLOCATIONS);

        $server->loadMissing(['allocation', 'allocations', 'node']);

        // Backfill server_id on the primary allocation for servers created
        // before the server_id column existed on allocations.
        if ($server->allocation && $server->allocation->server_id !== $server->id) {
            $server->allocation->update(['server_id' => $server->id]);
        }

        $allocations = Allocation::query()
            ->where(function ($query) use ($server): void {
                $query->where('server_id', $server->id)
                    ->orWhere('id', $server->allocation_id);
            })
            ->orderByRaw('id = ? DESC', [$server->allocation_id])
            ->orderBy('port')
            ->get()
            ->map(fn (Allocation $allocation): array => [
                'id' => $allocation->id,
                'bind_ip' => $allocation->bind_ip,
                'port' => $allocation->port,
                'ip_alias' => $allocation->ip_alias,
                'is_primary' => $allocation->id === $server->allocation_id,
            ])
            ->all();

        return Inertia::render('server/networking/allocations', [
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'allocation_id' => $server->allocation_id,
                'status' => $server->status,
            ],
            'allocations' => $allocations,
            'allocationsEnabled' => $this->appSettingsService->allocationsEnabled(),
            'allocationsLimit' => $server->allocation_limit ?? $this->appSettingsService->allocationsLimit(),
            'currentAllocationCount' => count($allocations) - 1,
            'usesGlobalLimit' => $server->allocation_limit === null,
        ]);
    }

    public function store(Request $request, Server $server): RedirectResponse
    {
        $this->authorizeServerAccess($request, $server, ServerUser::PERMISSION_ALLOCATIONS);

        abort_unless($this->appSettingsService->allocationsEnabled(), 403, 'Extra allocations are not enabled.');

        $server->loadMissing(['allocation', 'node']);
        $extraCount = Allocation::query()
            ->where('server_id', $server->id)
            ->where('id', '!=', $server->allocation_id)
            ->count();
        $limit = $server->allocation_limit ?? $this->appSettingsService->allocationsLimit();

        abort_unless($extraCount < $limit, 422, 'You have reached the maximum number of extra allocations.');

        $available = Allocation::query()
            ->where('node_id', $server->node_id)
            ->whereNull('server_id')
            ->whereDoesntHave('server')
            ->inRandomOrder()
            ->first();

        if (! $available) {
            return Redirect::back()->withErrors([
                'allocation' => 'No available allocations on this node. Ask an administrator to add more.',
            ]);
        }

        $available->update(['server_id' => $server->id]);

        return Redirect::back()->with('success', 'Allocation added.');
    }

    public function updatePrimary(Request $request, Server $server): RedirectResponse
    {
        $this->authorizeServerAccess($request, $server, ServerUser::PERMISSION_ALLOCATIONS);

        $validated = app(UpdateServerPrimaryAllocationRequest::class)->validated();
        $allocationId = (int) $validated['allocation_id'];

        $allocation = Allocation::query()
            ->where('id', $allocationId)
            ->where(function ($query) use ($server): void {
                $query->where('server_id', $server->id)
                    ->orWhere('id', $server->allocation_id);
            })
            ->first();
        abort_unless($allocation !== null, 422, 'This allocation does not belong to this server.');

        if ($server->allocation_id === $allocationId) {
            return Redirect::back()->with('success', 'Primary allocation unchanged.');
        }

        $server->loadMissing(['allocation', 'cargo', 'node.credential', 'user']);

        // Ensure the old primary allocation keeps its server_id so it
        // stays visible after the primary pointer moves away from it.
        if ($server->allocation && $server->allocation->server_id !== $server->id) {
            $server->allocation->update(['server_id' => $server->id]);
        }

        $targetServer = clone $server;

        $server->update(['allocation_id' => $allocationId]);
        $server->refresh()->loadMissing(['allocation', 'cargo', 'node.credential', 'user']);

        if ($this->serverRemoteUpdateService->push($targetServer, $server)) {
            return Redirect::back()->with('success', 'Primary allocation updated. skyportd saved the new server state.');
        }

        return Redirect::back()
            ->with('success', 'Primary allocation updated.')
            ->with('warning', 'skyportd could not be updated automatically. This server will need to be synced later.');
    }

    public function destroy(Request $request, Server $server, Allocation $allocation): RedirectResponse
    {
        $this->authorizeServerAccess($request, $server, ServerUser::PERMISSION_ALLOCATIONS);

        abort_unless(
            $allocation->server_id === $server->id,
            422,
            'This allocation does not belong to this server.',
        );

        abort_unless(
            $allocation->id !== $server->allocation_id,
            422,
            'The primary allocation cannot be deleted.',
        );

        $allocation->update(['server_id' => null]);

        return Redirect::back()->with('success', 'Allocation released.');
    }
}
