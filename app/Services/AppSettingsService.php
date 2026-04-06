<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Schema;

class AppSettingsService
{
    public const APP_NAME_KEY = 'app_name';

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
}
