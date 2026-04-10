<?php

namespace App\Http\Middleware;

use App\Services\AppSettingsService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Symfony\Component\HttpFoundation\Response;

class HandleAppearance
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        View::share('appearance', $request->cookie('appearance') ?? 'system');

        $service = app(AppSettingsService::class);
        $variables = $service->themeVariables();

        View::share('themeBackground', $variables['background'] ?? null);
        View::share('themeCSS', $service->buildThemeCSS());
        View::share('themeFontLinks', $service->themeFontLinks());

        return $next($request);
    }
}
