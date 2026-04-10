<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Client\Concerns\AuthorizesServerAccess;
use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Models\ServerUser;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ServerUsersController extends Controller
{
    use AuthorizesServerAccess;

    public function index(Request $request, Server $server): Response
    {
        $this->authorizeServerAccess($request, $server);

        $subusers = $server->serverUsers()
            ->with('user:id,name,email')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ServerUser $su): array => [
                'id' => $su->id,
                'user' => [
                    'id' => $su->user->id,
                    'name' => $su->user->name,
                    'email' => $su->user->email,
                ],
                'permissions' => $su->permissionList(),
                'created_at' => $su->created_at?->toIso8601String(),
            ])
            ->all();

        return Inertia::render('server/users', [
            'server' => [
                'id' => $server->id,
                'name' => $server->name,
                'status' => $server->status,
                'user_id' => $server->user_id,
            ],
            'subusers' => $subusers,
            'availablePermissions' => ServerUser::availablePermissions(),
            'isOwner' => $request->user()?->id === $server->user_id,
            'canManage' => $request->user()?->id === $server->user_id || $request->user()?->is_admin,
        ]);
    }

    public function store(Request $request, Server $server): RedirectResponse
    {
        $this->authorizeServerAccess($request, $server);
        $this->authorizeOwnership($request, $server);

        $validated = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'permissions' => ['required', 'array', 'min:1'],
            'permissions.*' => ['string', 'in:'.implode(',', ServerUser::availablePermissions())],
        ], [
            'email.required' => 'Please enter an email address.',
            'email.email' => 'Please enter a valid email address.',
            'email.exists' => 'No user with that email address was found.',
            'permissions.required' => 'Please select at least one permission.',
            'permissions.min' => 'Please select at least one permission.',
        ]);

        $targetUser = User::query()->where('email', $validated['email'])->first();

        if ($targetUser->id === $server->user_id) {
            return Redirect::back()->withErrors([
                'email' => 'You cannot add yourself as a subuser.',
            ]);
        }

        $existing = ServerUser::query()
            ->where('server_id', $server->id)
            ->where('user_id', $targetUser->id)
            ->first();

        if ($existing) {
            return Redirect::back()->withErrors([
                'email' => 'This user already has access to this server.',
            ]);
        }

        ServerUser::query()->create([
            'server_id' => $server->id,
            'user_id' => $targetUser->id,
            'permissions' => $validated['permissions'],
        ]);

        return Redirect::back()->with('success', "{$targetUser->name} has been added.");
    }

    public function update(Request $request, Server $server, ServerUser $serverUser): RedirectResponse
    {
        $this->authorizeServerAccess($request, $server);
        $this->authorizeOwnership($request, $server);

        abort_unless($serverUser->server_id === $server->id, 422, 'This user does not belong to this server.');

        $validated = $request->validate([
            'permissions' => ['required', 'array', 'min:1'],
            'permissions.*' => ['string', 'in:'.implode(',', ServerUser::availablePermissions())],
        ], [
            'permissions.required' => 'Please select at least one permission.',
            'permissions.min' => 'Please select at least one permission.',
        ]);

        $serverUser->update(['permissions' => $validated['permissions']]);

        return Redirect::back()->with('success', 'Permissions updated.');
    }

    public function destroy(Request $request, Server $server, ServerUser $serverUser): RedirectResponse
    {
        $this->authorizeServerAccess($request, $server);
        $this->authorizeOwnership($request, $server);

        abort_unless($serverUser->server_id === $server->id, 422, 'This user does not belong to this server.');

        $serverUser->delete();

        return Redirect::back()->with('success', 'User removed from this server.');
    }

    private function authorizeOwnership(Request $request, Server $server): void
    {
        abort_unless(
            $request->user()?->id === $server->user_id || $request->user()?->is_admin,
            403,
            'Only the server owner or an admin can manage users.',
        );
    }
}
