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

it('requires an application name when updating admin settings', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->patch('/admin/settings', [
            'app_name' => '',
        ])
        ->assertSessionHasErrors('app_name');
});
