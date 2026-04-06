<?php

use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

it('forbids non-admins from viewing the admin dashboard', function () {
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($user)
        ->get('/admin')
        ->assertForbidden();
});

it('shows the admin overview with recent user creation data', function () {
    Carbon::setTestNow('2026-04-06 12:00:00');

    $admin = User::factory()->create([
        'is_admin' => true,
        'created_at' => now()->subDays(40),
    ]);

    User::factory()->create([
        'created_at' => now()->subDay(),
    ]);

    User::factory()->create([
        'created_at' => now(),
    ]);

    User::factory()->create([
        'created_at' => now()->subDays(31),
    ]);

    $this->actingAs($admin)
        ->get('/admin')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/dashboard')
            ->where('recentUsersTotal', 2)
            ->has('recentUsers', 30)
            ->where('recentUsers.28.amount', 1)
            ->where('recentUsers.29.amount', 1),
        );

    Carbon::setTestNow();
});
