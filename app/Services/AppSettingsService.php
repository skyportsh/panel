<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Schema;

class AppSettingsService
{
    public const APP_NAME_KEY = 'app_name';

    public const ANNOUNCEMENT_KEY = 'announcement';

    public const ANNOUNCEMENT_ENABLED_KEY = 'announcement_enabled';

    public const ANNOUNCEMENT_TYPE_KEY = 'announcement_type';

    public const ANNOUNCEMENT_DISMISSABLE_KEY = 'announcement_dismissable';

    public const ANNOUNCEMENT_ICON_KEY = 'announcement_icon';

    public const TELEMETRY_ENABLED_KEY = 'telemetry_enabled';

    public const ALLOCATIONS_ENABLED_KEY = 'allocations_enabled';

    public const ALLOCATIONS_LIMIT_KEY = 'allocations_limit';

    public const THEME_KEY = 'theme';

    /**
     * @return list<string>
     */
    public static function announcementIcons(): array
    {
        return [
            'megaphone',
            'bell',
            'info',
            'triangle-alert',
            'sparkles',
        ];
    }

    public function appName(): string
    {
        $fallback = (string) config('app.name', 'Skyport');

        if (! Schema::hasTable('app_settings')) {
            return $fallback;
        }

        return AppSetting::query()
            ->where('key', self::APP_NAME_KEY)
            ->value('value') ?:
            $fallback;
    }

    public function setAppName(string $appName): void
    {
        AppSetting::query()->updateOrCreate(
            ['key' => self::APP_NAME_KEY],
            ['value' => $appName],
        );

        config(['app.name' => $appName]);
    }

    public function announcement(): ?string
    {
        if (! Schema::hasTable('app_settings')) {
            return null;
        }

        if (! $this->announcementEnabled()) {
            return null;
        }

        return AppSetting::query()
            ->where('key', self::ANNOUNCEMENT_KEY)
            ->value('value');
    }

    public function announcementEnabled(): bool
    {
        if (! Schema::hasTable('app_settings')) {
            return false;
        }

        return AppSetting::query()
            ->where('key', self::ANNOUNCEMENT_ENABLED_KEY)
            ->value('value') === '1';
    }

    public function announcementIcon(): string
    {
        if (! Schema::hasTable('app_settings')) {
            return 'megaphone';
        }

        return $this->normalizeAnnouncementIcon(
            AppSetting::query()
                ->where('key', self::ANNOUNCEMENT_ICON_KEY)
                ->value('value'),
        );
    }

    public function setAnnouncement(?string $announcement): void
    {
        AppSetting::query()->updateOrCreate(
            ['key' => self::ANNOUNCEMENT_KEY],
            ['value' => $announcement ?? ''],
        );
    }

    public function announcementType(): string
    {
        if (! Schema::hasTable('app_settings')) {
            return 'information';
        }

        return AppSetting::query()
            ->where('key', self::ANNOUNCEMENT_TYPE_KEY)
            ->value('value') ?? 'information';
    }

    public function setAnnouncementType(string $type): void
    {
        AppSetting::query()->updateOrCreate(
            ['key' => self::ANNOUNCEMENT_TYPE_KEY],
            ['value' => $type],
        );
    }

    public function announcementDismissable(): bool
    {
        if (! Schema::hasTable('app_settings')) {
            return false;
        }

        return AppSetting::query()
            ->where('key', self::ANNOUNCEMENT_DISMISSABLE_KEY)
            ->value('value') === '1';
    }

    public function setAnnouncementDismissable(bool $dismissable): void
    {
        AppSetting::query()->updateOrCreate(
            ['key' => self::ANNOUNCEMENT_DISMISSABLE_KEY],
            ['value' => $dismissable ? '1' : '0'],
        );
    }

    public function setAnnouncementEnabled(bool $enabled): void
    {
        AppSetting::query()->updateOrCreate(
            ['key' => self::ANNOUNCEMENT_ENABLED_KEY],
            ['value' => $enabled ? '1' : '0'],
        );
    }

    public function setAnnouncementIcon(string $icon): void
    {
        AppSetting::query()->updateOrCreate(
            ['key' => self::ANNOUNCEMENT_ICON_KEY],
            ['value' => $this->normalizeAnnouncementIcon($icon)],
        );
    }

    public function telemetryEnabled(): bool
    {
        // Environment variable takes precedence
        $envValue = env('SKYPORT_TELEMETRY_ENABLED');
        if ($envValue !== null) {
            return filter_var($envValue, FILTER_VALIDATE_BOOLEAN);
        }

        if (! Schema::hasTable('app_settings')) {
            return true;
        }

        $value = AppSetting::query()
            ->where('key', self::TELEMETRY_ENABLED_KEY)
            ->value('value');

        // Default to enabled if no setting has been stored yet
        return $value === null || $value === '1';
    }

    public function setTelemetryEnabled(bool $enabled): void
    {
        AppSetting::query()->updateOrCreate(
            ['key' => self::TELEMETRY_ENABLED_KEY],
            ['value' => $enabled ? '1' : '0'],
        );
    }

    public function allocationsEnabled(): bool
    {
        if (! Schema::hasTable('app_settings')) {
            return false;
        }

        return AppSetting::query()
            ->where('key', self::ALLOCATIONS_ENABLED_KEY)
            ->value('value') === '1';
    }

    public function setAllocationsEnabled(bool $enabled): void
    {
        AppSetting::query()->updateOrCreate(
            ['key' => self::ALLOCATIONS_ENABLED_KEY],
            ['value' => $enabled ? '1' : '0'],
        );
    }

    public function allocationsLimit(): int
    {
        if (! Schema::hasTable('app_settings')) {
            return 0;
        }

        $value = AppSetting::query()
            ->where('key', self::ALLOCATIONS_LIMIT_KEY)
            ->value('value');

        return $value !== null ? max(0, (int) $value) : 0;
    }

    public function setAllocationsLimit(int $limit): void
    {
        AppSetting::query()->updateOrCreate(
            ['key' => self::ALLOCATIONS_LIMIT_KEY],
            ['value' => (string) max(0, $limit)],
        );
    }

    public function theme(): string
    {
        if (! Schema::hasTable('app_settings')) {
            return 'magma';
        }

        return AppSetting::query()
            ->where('key', self::THEME_KEY)
            ->value('value') ?? 'magma';
    }

    public function setTheme(string $theme): void
    {
        AppSetting::query()->updateOrCreate(
            ['key' => self::THEME_KEY],
            ['value' => $theme],
        );
    }

    /**
     * @return array<int, array{id: string, name: string, description: string, swatches: list<string>}>
     */
    public function availableThemes(): array
    {
        $themesPath = storage_path('themes');

        if (! is_dir($themesPath)) {
            return [];
        }

        $themes = [];

        foreach (glob("{$themesPath}/*.json") as $file) {
            $data = json_decode((string) file_get_contents($file), true);

            if (! is_array($data) || ! isset($data['name'])) {
                continue;
            }

            $themes[] = [
                'id' => pathinfo($file, PATHINFO_FILENAME),
                'name' => $data['name'],
                'description' => $data['description'] ?? '',
                'swatches' => $data['swatches'] ?? [],
            ];
        }

        usort($themes, function (array $a, array $b): int {
            $priority = ['magma' => 0, 'classic' => 1];
            $pa = $priority[$a['id']] ?? 99;
            $pb = $priority[$b['id']] ?? 99;

            return $pa <=> $pb ?: strcmp($a['name'], $b['name']);
        });

        return $themes;
    }

    /**
     * @return array<string, string>|null
     */
    public function themeVariables(?string $themeId = null): ?array
    {
        $themeId ??= $this->theme();
        $file = storage_path("themes/{$themeId}.json");

        if (! file_exists($file)) {
            return null;
        }

        $data = json_decode((string) file_get_contents($file), true);

        return $data['variables'] ?? null;
    }

    /**
     * @return list<string>
     */
    public function themeFontLinks(?string $themeId = null): array
    {
        $themeId ??= $this->theme();
        $file = storage_path("themes/{$themeId}.json");

        if (! file_exists($file)) {
            return [];
        }

        $data = json_decode((string) file_get_contents($file), true);
        $fonts = $data['fonts'] ?? [];

        if (empty($fonts)) {
            return [];
        }

        $fontMap = [
            'IBM Plex Sans' => 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
            'IBM Plex Mono' => 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap',
            'JetBrains Mono' => 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap',
            'Lora' => 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap',
            'Playfair Display' => 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap',
            'Ubuntu' => 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap',
            'Ubuntu Mono' => 'https://fonts.googleapis.com/css2?family=Ubuntu+Mono:wght@400;700&display=swap',
            'Plus Jakarta Sans' => 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
        ];

        $links = [];
        $fontString = implode(' ', $fonts);

        foreach ($fontMap as $fontName => $url) {
            if (str_contains($fontString, $fontName)) {
                $links[] = $url;
            }
        }

        return $links;
    }

    public function buildThemeCSS(?string $themeId = null): ?string
    {
        $themeId ??= $this->theme();
        $file = storage_path("themes/{$themeId}.json");

        if (! file_exists($file)) {
            return null;
        }

        $data = json_decode((string) file_get_contents($file), true);
        $variables = $data['variables'] ?? [];
        $lightVariables = $data['light_variables'] ?? [];
        $fonts = $data['fonts'] ?? [];
        $radius = $data['radius'] ?? null;

        if (empty($variables) && empty($fonts) && ! $radius) {
            return null;
        }

        $lines = [];

        foreach ($variables as $key => $value) {
            $lines[] = "--{$key}: {$value};";
        }

        if ($radius) {
            $lines[] = '--radius: '.$radius.';';
        }

        $varBlock = implode(' ', $lines);
        $css = '.dark { '.$varBlock.' }';

        if (! empty($lightVariables)) {
            $lightLines = [];

            foreach ($lightVariables as $key => $value) {
                $lightLines[] = "--{$key}: {$value};";
            }

            if ($radius) {
                $lightLines[] = '--radius: '.$radius.';';
            }

            $css .= ' :root { '.implode(' ', $lightLines).' }';
        }

        if (! empty($fonts['sans'])) {
            $css .= ' body, button, input, select, textarea { font-family: '.$fonts['sans'].'; }';
        }

        if (! empty($fonts['heading'])) {
            $css .= ' h1,h2,h3,h4,h5,h6 { font-family: '.$fonts['heading'].'; }';
        }

        if (! empty($fonts['mono'])) {
            $css .= ' code,pre,kbd,.font-mono { font-family: '.$fonts['mono'].' !important; }';
        }

        return $css;
    }

    protected function normalizeAnnouncementIcon(?string $icon): string
    {
        return in_array($icon, self::announcementIcons(), true)
            ? $icon
            : 'megaphone';
    }
}
