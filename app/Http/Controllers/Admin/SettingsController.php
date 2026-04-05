<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateAppSettingsRequest;
use App\Services\AppSettingsService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(private AppSettingsService $appSettingsService) {}

    public function index(): Response
    {
        return Inertia::render('admin/settings', [
            'settings' => [
                'app_name' => $this->appSettingsService->appName(),
            ],
        ]);
    }

    public function update(UpdateAppSettingsRequest $request): RedirectResponse
    {
        $this->appSettingsService->setAppName($request->validated('app_name'));

        return back()->with('success', 'Settings updated.');
    }
}
