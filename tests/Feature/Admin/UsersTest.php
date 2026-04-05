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

test('admin can filter admin users only', function () {
    $admin = User::factory()->create(['is_admin' => true, 'name' => 'Admin User']);
    User::factory()->create(['is_admin' => false, 'name' => 'Regular User']);

    $this->actingAs($admin)
        ->get('/admin/users?admin_only=1')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('users.data', 1)
            ->where('users.data.0.name', 'Admin User')
            ->where('filters.admin_only', true),
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
        ])
        ->assertRedirect();

    $user->refresh();
    expect($user->name)->toBe('New Name');
    expect($user->email)->toBe('new@example.com');
});

test('admin cannot update user with duplicate email', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    User::factory()->create(['email' => 'taken@example.com']);
    $user = User::factory()->create();

    $this->actingAs($admin)
        ->patch("/admin/users/{$user->id}", [
            'name' => $user->name,
            'email' => 'taken@example.com',
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

test('admin can create a user', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->post('/admin/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password123',
        ])
        ->assertRedirect();

    $user = User::where('email', 'newuser@example.com')->first();
    expect($user)->not->toBeNull();
    expect($user->name)->toBe('New User');
});

test('admin can create an admin user', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->post('/admin/users', [
            'name' => 'Admin Person',
            'email' => 'adminperson@example.com',
            'password' => 'password123',
            'is_admin' => true,
        ])
        ->assertRedirect();

    $user = User::where('email', 'adminperson@example.com')->first();
    expect($user)->not->toBeNull();
    expect($user->is_admin)->toBeTrue();
});

test('admin cannot create user with duplicate email', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    User::factory()->create(['email' => 'taken@example.com']);

    $this->actingAs($admin)
        ->post('/admin/users', [
            'name' => 'Another User',
            'email' => 'taken@example.com',
            'password' => 'password123',
        ])
        ->assertSessionHasErrors('email');
});

test('admin cannot create user with short password', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->post('/admin/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'short',
        ])
        ->assertSessionHasErrors('password');
});

test('non-admin cannot create users', function () {
    $user = User::factory()->create(['is_admin' => false]);

    $this->actingAs($user)
        ->post('/admin/users', [
            'name' => 'Hack',
            'email' => 'hack@x.com',
            'password' => 'password123',
        ])
        ->assertForbidden();
});

test('admin can delete a user', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();

    $this->actingAs($admin)
        ->delete("/admin/users/{$user->id}")
        ->assertRedirect();

    expect(User::find($user->id))->toBeNull();
});

test('admin cannot delete themselves', function () {
    $admin = User::factory()->create(['is_admin' => true]);

    $this->actingAs($admin)
        ->delete("/admin/users/{$admin->id}")
        ->assertSessionHasErrors('delete');

    expect(User::find($admin->id))->not->toBeNull();
});

test('admin can bulk delete users', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $users = User::factory()->count(3)->create();

    $this->actingAs($admin)
        ->delete('/admin/users/bulk-destroy', [
            'ids' => $users->pluck('id')->all(),
        ])
        ->assertRedirect();

    expect(User::whereIn('id', $users->pluck('id'))->count())->toBe(0);
});

test('admin cannot bulk delete themselves', function () {
    $admin = User::factory()->create(['is_admin' => true]);
    $user = User::factory()->create();

    $this->actingAs($admin)
        ->delete('/admin/users/bulk-destroy', [
            'ids' => [$admin->id, $user->id],
        ])
        ->assertRedirect();

    expect(User::find($admin->id))->not->toBeNull();
    expect(User::find($user->id))->toBeNull();
});

test('non-admin cannot delete users', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $target = User::factory()->create();

    $this->actingAs($user)
        ->delete("/admin/users/{$target->id}")
        ->assertForbidden();
});

test('non-admin cannot update users', function () {
    $user = User::factory()->create(['is_admin' => false]);
    $target = User::factory()->create();

    $this->actingAs($user)
        ->patch("/admin/users/{$target->id}", [
            'name' => 'Hack',
            'email' => 'hack@x.com',
        ])
        ->assertForbidden();
});
