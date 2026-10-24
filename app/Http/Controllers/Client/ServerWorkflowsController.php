<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Client\Concerns\AuthorizesServerAccess;
use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Models\Workflow;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class ServerWorkflowsController extends Controller
{
    use AuthorizesServerAccess;

    public function index(Request $request, Server $server): Response
    {
        $this->authorizeOwnership($request, $server);

        $workflows = $server->workflows()
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Workflow $w): array => [
                'id' => $w->id,
                'name' => $w->name,
                'enabled' => $w->enabled,
                'nodes' => $w->nodes,
                'edges' => $w->edges,
                'updated_at' => $w->updated_at?->toIso8601String(),
            ])
            ->all();

        return Inertia::render('server/workflows', [
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'status' => $server->status,
            ],
            'workflows' => $workflows,
        ]);
    }

    public function store(Request $request, Server $server): RedirectResponse
    {
        $this->authorizeOwnership($request, $server);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        Workflow::query()->create([
            'server_id' => $server->id,
            'name' => $validated['name'],
            'nodes' => [],
            'edges' => [],
        ]);

        return Redirect::back()->with('success', 'Workflow created.');
    }

    public function update(Request $request, Server $server, Workflow $workflow): RedirectResponse
    {
        $this->authorizeOwnership($request, $server);

        abort_unless($workflow->server_id === $server->id, 422);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'enabled' => ['sometimes', 'boolean'],
            'nodes' => ['sometimes', 'array'],
            'edges' => ['sometimes', 'array'],
        ]);

        $workflow->update($validated);

        return Redirect::back()->with('success', 'Workflow saved.');
    }

    public function destroy(Request $request, Server $server, Workflow $workflow): RedirectResponse
    {
        $this->authorizeOwnership($request, $server);

        abort_unless($workflow->server_id === $server->id, 422);

        $workflow->delete();

        return Redirect::back()->with('success', 'Workflow deleted.');
    }

    private function authorizeOwnership(Request $request, Server $server): void
    {
        abort_unless(
            $request->user()?->id === $server->user_id || $request->user()?->is_admin,
            HttpResponse::HTTP_FORBIDDEN,
            'Only the server owner or an administrator can manage workflows.',
        );
    }
}
