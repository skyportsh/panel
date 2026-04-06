<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateAppSettingsRequest;
use App\Models\AppSetting;
use App\Services\AppSettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(
        private AppSettingsService $appSettingsService,
    ) {}

    public function index(): Response
    {
        return Inertia::render('admin/settings', [
            'settings' => [
                'app_name' => $this->appSettingsService->appName(),
                'announcement' => AppSetting::query()
                    ->where('key', AppSettingsService::ANNOUNCEMENT_KEY)
                    ->value('value') ?? '',
                'announcement_enabled' => $this->appSettingsService->announcementEnabled(),
            ],
        ]);
    }

    public function update(UpdateAppSettingsRequest $request): RedirectResponse
    {
        $this->appSettingsService->setAppName($request->validated('app_name'));
        $this->appSettingsService->setAnnouncement($request->validated('announcement'));
        $this->appSettingsService->setAnnouncementEnabled($request->boolean('announcement_enabled'));

        return Redirect::back()->with('success', 'Settings updated.');
    }
}
