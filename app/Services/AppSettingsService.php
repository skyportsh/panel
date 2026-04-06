<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Schema;

class AppSettingsService
{
    public const APP_NAME_KEY = 'app_name';

    public const ANNOUNCEMENT_KEY = 'announcement';

    public const ANNOUNCEMENT_ENABLED_KEY = 'announcement_enabled';

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

    public function setAnnouncement(?string $announcement): void
    {
        AppSetting::query()->updateOrCreate(
            ['key' => self::ANNOUNCEMENT_KEY],
            ['value' => $announcement ?? ''],
        );
    }

    public function setAnnouncementEnabled(bool $enabled): void
    {
        AppSetting::query()->updateOrCreate(
            ['key' => self::ANNOUNCEMENT_ENABLED_KEY],
            ['value' => $enabled ? '1' : '0'],
        );
    }
}
