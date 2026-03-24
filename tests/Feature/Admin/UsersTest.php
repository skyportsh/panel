<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('non-admin cannot access admin users page', function () {
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($user)
        ->get('/admin/users')
        ->assertForbidden();
});

test('admin can access users page', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->get('/admin/users')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users')
            ->has('users.data')
            ->has('filters'),
        );
});

test('admin can search users', function () {
    $admin = User::factory()->create(['is_admin' => true, 'name' => 'Admin User']);
    User::factory()->create(['name' => 'Alice Smith', 'email' => 'alice@example.com']);
    User::factory()->create(['name' => 'Bob Jones', 'email' => 'bob@example.com']);

    $this->actingAs($admin)
        ->get('/admin/users?search=Alice')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('users.data', 1)
            ->where('users.data.0.name', 'Alice Smith'),
        );
});

test('admin can update a user name and email', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create(['name' => 'Old Name', 'email' => 'old@example.com']);

    $this->actingAs($admin)
        ->patch("/admin/users/{$user->id}", [
            'name' => 'New Name',
            'email' => 'new@example.com',
            'coins_balance' => 0,
            'credit_balance' => 0,
            'preferred_currency' => 'GBP',
        ])
        ->assertRedirect();

    $user->refresh();
    expect($user->name)->toBe('New Name');
    expect($user->email)->toBe('new@example.com');
});

test('admin can update coins and credit balance', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create(['coins_balance' => 0, 'credit_balance' => 0]);

    $this->actingAs($admin)
        ->patch("/admin/users/{$user->id}", [
            'name' => $user->name,
            'email' => $user->email,
            'coins_balance' => 500,
            'credit_balance' => 9999,
            'preferred_currency' => 'GBP',
        ])
        ->assertRedirect();

    $user->refresh();
    expect($user->coins_balance)->toBe(500);
    expect($user->credit_balance)->toBe(9999);
});

test('admin cannot update user with duplicate email', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    User::factory()->create(['email' => 'taken@example.com']);
    $user = User::factory()->create();

    $this->actingAs($admin)
        ->patch("/admin/users/{$user->id}", [
            'name' => $user->name,
            'email' => 'taken@example.com',
            'coins_balance' => 0,
            'credit_balance' => 0,
            'preferred_currency' => 'GBP',
        ])
        ->assertSessionHasErrors('email');
});

test('admin can suspend a user', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create(['suspended_at' => null]);

    $this->actingAs($admin)
        ->post("/admin/users/{$user->id}/suspend")
        ->assertRedirect();

    expect($user->fresh()->suspended_at)->not->toBeNull();
});

test('admin cannot suspend themselves', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->post("/admin/users/{$admin->id}/suspend")
        ->assertSessionHasErrors('suspend');

    expect($admin->fresh()->suspended_at)->toBeNull();
});

test('admin can unsuspend a user', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create(['suspended_at' => now()]);

    $this->actingAs($admin)
        ->post("/admin/users/{$user->id}/unsuspend")
        ->assertRedirect();

    expect($user->fresh()->suspended_at)->toBeNull();
});

test('admin can verify a user email', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->unverified()->create();

    $this->actingAs($admin)
        ->post("/admin/users/{$user->id}/verify-email")
        ->assertRedirect();

    expect($user->fresh()->email_verified_at)->not->toBeNull();
});

test('admin can impersonate a user', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();

    $this->actingAs($admin)
        ->post("/admin/users/{$user->id}/impersonate")
        ->assertRedirect(route('home'));

    expect(auth()->id())->toBe($user->id);
    expect(session('impersonator_id'))->toBe($admin->id);
});

test('admin cannot impersonate themselves', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->post("/admin/users/{$admin->id}/impersonate")
        ->assertSessionHasErrors('impersonate');
});

test('impersonating user can stop impersonating', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['impersonator_id' => $admin->id])
        ->post('/admin/stop-impersonating')
        ->assertRedirect(route('admin.users.index'));

    expect(auth()->id())->toBe($admin->id);
    expect(session()->has('impersonator_id'))->toBeFalse();
});

test('non-admin cannot update users', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $target = User::factory()->create();

    $this->actingAs($user)
        ->patch("/admin/users/{$target->id}", [
            'name' => 'Hack',
            'email' => 'hack@x.com',
            'coins_balance' => 0,
            'credit_balance' => 0,
            'preferred_currency' => 'GBP',
        ])
        ->assertForbidden();
});
