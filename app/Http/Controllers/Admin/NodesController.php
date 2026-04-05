<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreNodeRequest;
use App\Http\Requests\Admin\UpdateNodeRequest;
use App\Models\Location;
use App\Models\Node;
use App\Services\NodeConfigurationService;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NodesController extends Controller
{
    public function __construct(private NodeConfigurationService $nodeConfigurationService) {}

    public function index(Request $request): Response
    {
        $nodes = Node::query()
            ->with('location:id,name,country')
            ->when($request->input('search'), function ($query, string $search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('fqdn', 'like', "%{$search}%")
                        ->orWhereHas('location', function ($locationQuery) use ($search) {
                            $locationQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('country', 'like', "%{$search}%");
                        });
                });
            })
            ->orderByDesc('updated_at')
            ->paginate(10)
            ->through(fn (Node $node): array => [
                'connection_status' => $this->connectionStatus($node),
                'created_at' => $node->created_at?->toIso8601String(),
                'daemon_port' => $node->daemon_port,
                'daemon_uuid' => $node->daemon_uuid,
                'daemon_version' => $node->daemon_version,
                'enrolled_at' => $node->enrolled_at?->toIso8601String(),
                'fqdn' => $node->fqdn,
                'id' => $node->id,
                'last_seen_at' => $node->last_seen_at?->toIso8601String(),
                'location' => [
                    'country' => $node->location->country,
                    'id' => $node->location->id,
                    'name' => $node->location->name,
                ],
                'name' => $node->name,
                'sftp_port' => $node->sftp_port,
                'status' => $node->status,
                'updated_at' => $node->updated_at?->toIso8601String(),
                'use_ssl' => $node->use_ssl,
            ])
            ->withQueryString();

        $locations = Location::query()
            ->orderBy('name')
            ->get(['id', 'name', 'country']);

        return Inertia::render('admin/nodes', [
            'nodes' => $nodes,
            'locations' => $locations,
            'filters' => [
                'search' => $request->input('search', ''),
            ],
        ]);
    }

    public function store(StoreNodeRequest $request): RedirectResponse
    {
        Node::create([
            ...$request->validated(),
            'use_ssl' => $request->boolean('use_ssl'),
        ]);

        return back()->with('success', 'Node created.');
    }

    public function generateConfigurationToken(Node $node): JsonResponse
    {
        $issued = $this->nodeConfigurationService->issue($node);

        return response()->json([
            'expires_at' => $issued['expires_at']->toIso8601String(),
            'status' => 'configured',
            'token' => $issued['token'],
        ]);
    }

    public function update(UpdateNodeRequest $request, Node $node): RedirectResponse
    {
        $node->update([
            ...$request->validated(),
            'use_ssl' => $request->boolean('use_ssl'),
        ]);

        return back()->with('success', 'Node updated.');
    }

    public function destroy(Node $node): RedirectResponse
    {
        $node->delete();

        return back()->with('success', 'Node deleted.');
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'exists:nodes,id'],
        ]);

        $ids = $validated['ids'];
        $count = count($ids);

        Node::whereIn('id', $ids)->delete();

        return back()->with('success', $count.' '.str('node')->plural($count).' deleted.');
    }

    private function connectionStatus(Node $node): string
    {
        if ($node->status === 'draft' || $node->status === 'configured') {
            return $node->status;
        }

        if ($node->last_seen_at instanceof CarbonInterface && $node->last_seen_at->isAfter(now()->subSeconds(15))) {
            return 'online';
        }

        return 'offline';
    }
}
