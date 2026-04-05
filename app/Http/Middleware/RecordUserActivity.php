<?php

namespace App\Http\Middleware;

use App\Models\UserActivity;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
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

        if (! $request->route() || $request->route()->named('ignition.*') || ! $this->shouldRecord($request)) {
            return $response;
        }

        $user ??= $request->user();

        if (! $user) {
            return $response;
        }

        UserActivity::create([
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
                'route_parameters' => Arr::where($request->route()->parameters(), fn (mixed $value): bool => is_scalar($value)),
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

        return in_array($routeName, [
            'login.store',
            'logout',
            'password.confirm.store',
            'profile.update',
            'two-factor.confirm',
            'two-factor.disable',
            'two-factor.enable',
            'two-factor.login.store',
            'two-factor.regenerate-recovery-codes',
            'user-password.update',
        ], true);
    }

    private function action(Request $request): string
    {
        $routeName = $request->route()?->getName();

        if (! is_string($routeName) || $routeName === '') {
            return sprintf('%s %s', $request->method(), '/'.$request->path());
        }

        return match ($routeName) {
            'login.store' => 'Logged in',
            'logout' => 'Logged out',
            'password.confirm.store' => 'Confirmed password',
            'profile.update' => 'Updated profile',
            'two-factor.confirm' => 'Confirmed two-factor authentication',
            'two-factor.disable' => 'Disabled two-factor authentication',
            'two-factor.enable' => 'Enabled two-factor authentication',
            'two-factor.login.store' => 'Completed two-factor login',
            'two-factor.regenerate-recovery-codes' => 'Regenerated recovery codes',
            'user-password.update' => 'Changed password',
            default => str($routeName)
                ->replace('.', ' ')
                ->replace('-', ' ')
                ->replace('_', ' ')
                ->title()
                ->toString(),
        };
    }
}
