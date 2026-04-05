<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLocationRequest;
use App\Http\Requests\Admin\UpdateLocationRequest;
use App\Models\Location;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LocationsController extends Controller
{
    public function index(Request $request): Response
    {
        $locations = Location::query()
            ->withCount('nodes')
            ->when($request->input('search'), function ($query, string $search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('country', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('updated_at')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('admin/locations', [
            'locations' => $locations,
            'filters' => [
                'search' => $request->input('search', ''),
            ],
        ]);
    }

    public function store(StoreLocationRequest $request): RedirectResponse
    {
        Location::create($request->validated());

        return back()->with('success', 'Location created.');
    }

    public function update(UpdateLocationRequest $request, Location $location): RedirectResponse
    {
        $location->update($request->validated());

        return back()->with('success', 'Location updated.');
    }

    public function destroy(Location $location): RedirectResponse
    {
        $location->delete();

        return back()->with('success', 'Location deleted.');
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'exists:locations,id'],
        ]);

        $ids = $validated['ids'];
        $count = count($ids);

        Location::whereIn('id', $ids)->delete();

        return back()->with('success', $count.' '.str('location')->plural($count).' deleted.');
    }
}
