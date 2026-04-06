<?php

namespace App\Http\Middleware;

use App\Services\AppSettingsService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApplyAppSettings
{
    public function __construct(
        private AppSettingsService $appSettingsService,
    ) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        config(['app.name' => $this->appSettingsService->appName()]);

        return $next($request);
    }
}
