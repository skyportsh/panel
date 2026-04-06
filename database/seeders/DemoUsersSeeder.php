<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DemoUsersSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        collect(range(1, 25))
            ->each(function (int $index): void {
                User::query()->updateOrCreate(
                    ['email' => sprintf('demo.user.%02d@example.test', $index)],
                    [
                        'name' => sprintf('Demo User %02d', $index),
                        'password' => 'password',
                        'email_verified_at' => now(),
                        'is_admin' => false,
                        'suspended_at' => null,
                    ],
                );
            });
    }
}
