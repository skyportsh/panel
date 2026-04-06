<?php

use App\Models\AppSetting;
use App\Models\User;
use App\Services\AppSettingsService;
use Inertia\Testing\AssertableInertia as Assert;

it('forbids non-admins from viewing admin settings', function () {
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($user)
        ->get('/admin/settings')
        ->assertForbidden();
});

it('allows admins to view admin settings', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->get('/admin/settings')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/settings')
            ->where('settings.app_name', config('app.name'))
            ->where('settings.announcement_icon', 'megaphone')
            ->where('name', config('app.name')),
        );
});

it('allows admins to update the application name', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->patch('/admin/settings', [
            'app_name' => 'Ether',
        ])
        ->assertRedirect();

    expect(AppSetting::query()->where('key', AppSettingsService::APP_NAME_KEY)->value('value'))
        ->toBe('Ether');

    $this->actingAs($admin)
        ->get('/admin/users')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('name', 'Ether'));
});

it('allows admins to update the announcement settings', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->patch('/admin/settings', [
            'app_name' => 'Skyport',
            'announcement' => 'Scheduled maintenance tonight.',
            'announcement_enabled' => true,
            'announcement_type' => 'warning',
            'announcement_dismissable' => true,
            'announcement_icon' => 'triangle-alert',
        ])
        ->assertRedirect();

    expect(AppSetting::query()->where('key', AppSettingsService::ANNOUNCEMENT_KEY)->value('value'))
        ->toBe('Scheduled maintenance tonight.');
    expect(AppSetting::query()->where('key', AppSettingsService::ANNOUNCEMENT_ENABLED_KEY)->value('value'))
        ->toBe('1');
    expect(AppSetting::query()->where('key', AppSettingsService::ANNOUNCEMENT_TYPE_KEY)->value('value'))
        ->toBe('warning');
    expect(AppSetting::query()->where('key', AppSettingsService::ANNOUNCEMENT_DISMISSABLE_KEY)->value('value'))
        ->toBe('1');
    expect(AppSetting::query()->where('key', AppSettingsService::ANNOUNCEMENT_ICON_KEY)->value('value'))
        ->toBe('triangle-alert');

    $this->actingAs($admin)
        ->get('/admin/settings')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('settings.announcement', 'Scheduled maintenance tonight.')
            ->where('settings.announcement_enabled', true)
            ->where('settings.announcement_type', 'warning')
            ->where('settings.announcement_dismissable', true)
            ->where('settings.announcement_icon', 'triangle-alert')
            ->where('announcement', 'Scheduled maintenance tonight.')
            ->where('announcementType', 'warning')
            ->where('announcementDismissable', true)
            ->where('announcementIcon', 'triangle-alert'),
        );
});

it('requires an application name when updating admin settings', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->patch('/admin/settings', [
            'app_name' => '',
        ])
        ->assertSessionHasErrors('app_name');
});

it('requires a valid announcement icon when updating admin settings', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->patch('/admin/settings', [
            'app_name' => 'Skyport',
            'announcement_icon' => 'invalid-icon',
        ])
        ->assertSessionHasErrors('announcement_icon');
});
