<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreNodeRequest;
use App\Http\Requests\Admin\UpdateNodeRequest;
use App\Models\Location;
use App\Models\Node;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class NodesController extends Controller
{
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
}
