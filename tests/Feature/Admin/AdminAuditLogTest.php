<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

it('forbids non-admins from viewing the audit log', function () {
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($user)
        ->get('/admin/audit-log')
        ->assertForbidden();
});

it('shows the audit log page for admins', function () {
    $admin = User::factory()->create([
        'is_admin' => true,
        'created_at' => now()->subDays(40),
    ]);

    $this->actingAs($admin)
        ->get('/admin/audit-log')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/audit-log')
            ->has('activities')
            ->has('links')
            ->has('meta')
            ->has('filters'),
        );
});
