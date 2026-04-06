<?php

use App\Models\User;
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
