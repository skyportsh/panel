<?php

use App\Models\User;
use App\Models\UserActivity;
use Inertia\Testing\AssertableInertia as Assert;

it('forbids non-admins from viewing the activity log', function () {
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($user)->get('/admin/audit-log')->assertForbidden();
});

it('shows the activity page for admins', function () {
    $admin = User::factory()->create([
        'is_admin' => true,
        'created_at' => now()->subDays(40),
    ]);

    $this->actingAs($admin)
        ->get('/admin/audit-log')
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->component('admin/audit-log')
                ->has('activities')
                ->has('activities.data')
                ->has('activities.links')
                ->has('activities.current_page')
                ->has('activities.last_page')
                ->has('activities.total')
                ->has('filters'),
        );
});

it('paginates the activity page for admins', function () {
    $admin = User::factory()->create([
        'is_admin' => true,
    ]);

    foreach (range(1, 21) as $number) {
        UserActivity::factory()->create([
            'action' => "Activity {$number}",
            'created_at' => now()->subMinutes(30 - $number),
            'updated_at' => now()->subMinutes(30 - $number),
            'user_id' => $admin->id,
        ]);
    }

    $this->actingAs($admin)
        ->get('/admin/audit-log?page=2')
        ->assertOk()
        ->assertInertia(
            fn (Assert $page) => $page
                ->where('activities.current_page', 2)
                ->where('activities.last_page', 2)
                ->where('activities.total', 21)
                ->has('activities.data', 1)
                ->where('activities.data.0.action', 'Activity 1'),
        );
});
