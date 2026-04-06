<?php

namespace App\Http\Middleware;

use App\Models\UserActivity;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class RecordUserActivity
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $response = $next($request);

        if (
            ! $request->route() ||
            $request->route()->named('ignition.*') ||
            ! $this->shouldRecord($request)
        ) {
            return $response;
        }

        $user ??= $request->user();

        if (! $user) {
            return $response;
        }

        UserActivity::query()->create([
            'user_id' => $user->id,
            'action' => $this->action($request),
            'route_name' => $request->route()->getName(),
            'method' => $request->method(),
            'path' => '/'.$request->path(),
            'status_code' => $response->getStatusCode(),
            'user_agent' => $request->userAgent(),
            'context' => [
                'full_url' => $request->fullUrl(),
                'query' => $request->query(),
                'referer' => $request->headers->get('referer'),
                'route_parameters' => Arr::where(
                    $request->route()->parameters(),
                    fn (mixed $value): bool => is_scalar($value),
                ),
            ],
        ]);

        return $response;
    }

    private function shouldRecord(Request $request): bool
    {
        $routeName = $request->route()?->getName();

        if (! is_string($routeName) || $routeName === '') {
            return false;
        }

        // Skip read-only GET requests to avoid flooding the log
        if ($request->isMethod('GET')) {
            return false;
        }

        // Skip asset and debug routes
        if (Str::startsWith($routeName, ['debugbar.', 'horizon.', 'telescope.'])) {
            return false;
        }

        return true;
    }

    private function action(Request $request): string
    {
        $routeName = $request->route()?->getName();

        if (! is_string($routeName) || $routeName === '') {
            return sprintf('%s %s', $request->method(), '/'.$request->path());
        }

        return match ($routeName) {
            // Auth
            'login.store' => 'Logged in',
            'logout' => 'Logged out',
            'password.confirm.store' => 'Confirmed password',
            'profile.update' => 'Updated profile',
            'profile.destroy' => 'Deleted account',
            'two-factor.confirm' => 'Confirmed two-factor authentication',
            'two-factor.disable' => 'Disabled two-factor authentication',
            'two-factor.enable' => 'Enabled two-factor authentication',
            'two-factor.login.store' => 'Completed two-factor login',
            'two-factor.regenerate-recovery-codes' => 'Regenerated recovery codes',
            'user-password.update' => 'Changed password',
            'passkeys.store' => 'Registered a passkey',
            'passkeys.destroy' => 'Deleted a passkey',

            // Admin: Users
            'admin.users.store' => 'Created a user',
            'admin.users.update' => 'Updated a user',
            'admin.users.destroy' => 'Deleted a user',
            'admin.users.bulk-destroy' => 'Bulk deleted users',
            'admin.users.suspend' => 'Suspended a user',
            'admin.users.unsuspend' => 'Unsuspended a user',
            'admin.users.impersonate' => 'Started impersonating a user',
            'admin.stop-impersonating' => 'Stopped impersonating',

            // Admin: Servers
            'admin.servers.store' => 'Created a server',
            'admin.servers.update' => 'Updated a server',
            'admin.servers.destroy' => 'Deleted a server',
            'admin.servers.bulk-destroy' => 'Bulk deleted servers',
            'admin.servers.reinstall' => 'Reinstalled a server',

            // Admin: Nodes
            'admin.nodes.store' => 'Created a node',
            'admin.nodes.update' => 'Updated a node',
            'admin.nodes.destroy' => 'Deleted a node',
            'admin.nodes.bulk-destroy' => 'Bulk deleted nodes',
            'admin.nodes.configure-token' => 'Generated node configuration token',
            'admin.nodes.allocations.store' => 'Created node allocations',

            // Admin: Cargo
            'admin.cargo.store' => 'Created a cargo',
            'admin.cargo.update' => 'Updated a cargo',
            'admin.cargo.destroy' => 'Deleted a cargo',
            'admin.cargo.bulk-destroy' => 'Bulk deleted cargo',
            'admin.cargo.import' => 'Imported cargo',

            // Admin: Locations
            'admin.locations.store' => 'Created a location',
            'admin.locations.update' => 'Updated a location',
            'admin.locations.destroy' => 'Deleted a location',
            'admin.locations.bulk-destroy' => 'Bulk deleted locations',

            // Admin: Settings
            'admin.settings.update' => 'Updated panel settings',

            // Client: Server power
            'client.servers.power' => 'Sent server power signal',

            default => Str::of($routeName)
                ->replace('.', ' ')
                ->replace('-', ' ')
                ->replace('_', ' ')
                ->title()
                ->toString(),
        };
    }
}
