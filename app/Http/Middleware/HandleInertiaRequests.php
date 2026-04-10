<?php

namespace App\Http\Middleware;

use App\Models\Server;
use App\Models\User;
use App\Services\AppSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => fn (): ?array => $this->sharedUser($request->user()),
            ],
            'flash' => [
                'info' => fn (): ?string => $request->session()->get('info'),
                'success' => fn (): ?string => $request
                    ->session()
                    ->get('success'),
                'warning' => fn (): ?string => $request
                    ->session()
                    ->get('warning'),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') ||
                $request->cookie('sidebar_state') === 'true',
            'impersonating' => $request->session()->has('impersonator_id'),
            'announcement' => fn (): ?string => app(
                AppSettingsService::class,
            )->announcement(),
            'announcementType' => fn (): string => app(
                AppSettingsService::class,
            )->announcementType(),
            'announcementDismissable' => fn (): bool => app(
                AppSettingsService::class,
            )->announcementDismissable(),
            'announcementIcon' => fn (): string => app(
                AppSettingsService::class,
            )->announcementIcon(),
            'themeCSS' => fn (): ?string => $this->buildThemeCSS(),
            'serverSwitcher' => fn (): array => $this->sharedServerSwitcher(
                $request,
            ),
        ];
    }

    /**
     * @return array<int, array{id: int, name: string, status: string}>
     */
    protected function sharedServerSwitcher(Request $request): array
    {
        $user = $request->user();

        if (! $user || ! Schema::hasTable('servers')) {
            return [];
        }

        // When an admin views a server they don't own, scope the switcher
        // to the server owner's servers instead of showing every server.
        if ($user->is_admin && preg_match('#^/server/(\d+)#', $request->getPathInfo(), $matches)) {
            $server = Server::query()->find((int) $matches[1]);

            if ($server && $server->user_id !== $user->id) {
                return Server::query()
                    ->where('user_id', $server->user_id)
                    ->select(['id', 'name', 'status'])
                    ->orderBy('name')
                    ->get()
                    ->map(
                        fn (Server $s): array => [
                            'id' => $s->id,
                            'name' => $s->name,
                            'status' => $s->status,
                        ],
                    )
                    ->all();
            }
        }

        return ($user->is_admin ? Server::query() : $user->servers())
            ->select(['id', 'name', 'status'])
            ->orderBy('name')
            ->get()
            ->map(
                fn (Server $server): array => [
                    'id' => $server->id,
                    'name' => $server->name,
                    'status' => $server->status,
                ],
            )
            ->all();
    }

    /**
     * @return array<string, bool|int|string|null>|null
     */
    protected function buildThemeCSS(): ?string
    {
        $service = app(AppSettingsService::class);
        $themeId = $service->theme();
        $file = storage_path("themes/{$themeId}.json");

        if (! file_exists($file)) {
            return null;
        }

        $data = json_decode((string) file_get_contents($file), true);
        $variables = $data['variables'] ?? [];
        $fonts = $data['fonts'] ?? [];

        if (empty($variables) && empty($fonts)) {
            return null;
        }

        $lines = [];

        foreach ($variables as $key => $value) {
            $lines[] = "--{$key}: {$value};";
        }

        $css = '.dark { '.implode(' ', $lines).' }';

        if (! empty($fonts['heading'])) {
            $css .= ' h1,h2,h3,h4,h5,h6 { font-family: '.$fonts['heading'].'; }';
        }

        if (! empty($fonts['mono'])) {
            $css .= ' code,pre,kbd,.font-mono { font-family: '.$fonts['mono'].' !important; }';
        }

        return $css;
    }

    protected function sharedUser(?User $user): ?array
    {
        if (! $user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified_at' => $user->email_verified_at?->toIso8601String(),
            'is_admin' => $user->is_admin,
            'suspended_at' => $user->suspended_at?->toIso8601String(),
            'two_factor_enabled' => $user->two_factor_secret !== null,
            'created_at' => $user->created_at?->toIso8601String(),
            'updated_at' => $user->updated_at?->toIso8601String(),
        ];
    }
}
