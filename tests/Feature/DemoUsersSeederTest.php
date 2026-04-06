<?php

use App\Models\User;
use Database\Seeders\DemoUsersSeeder;
use Illuminate\Support\Facades\Hash;

test('demo users seeder creates an idempotent batch of fake users', function () {
    $this->seed(DemoUsersSeeder::class);
    $this->seed(DemoUsersSeeder::class);

    $demoUsers = User::query()
        ->where('email', 'like', 'demo.user.%@example.test')
        ->orderBy('email')
        ->get();

    expect($demoUsers)->toHaveCount(25)
        ->and(User::query()->count())->toBe(25)
        ->and($demoUsers->first()?->name)->toBe('Demo User 01')
        ->and($demoUsers->last()?->email)->toBe('demo.user.25@example.test')
        ->and(Hash::check('password', $demoUsers->firstOrFail()->password))->toBeTrue()
        ->and($demoUsers->every(fn (User $user): bool => $user->email_verified_at !== null))->toBeTrue()
        ->and($demoUsers->every(fn (User $user): bool => $user->is_admin === false))->toBeTrue();
});
