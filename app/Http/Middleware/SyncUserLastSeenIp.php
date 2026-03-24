<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SyncUserLastSeenIp
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && $request->ip() !== $request->user()->last_seen_ip) {
            $request->user()->forceFill([
                'last_seen_ip' => $request->ip(),
            ])->save();
        }

        return $next($request);
    }
}
