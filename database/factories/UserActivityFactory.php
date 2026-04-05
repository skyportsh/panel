<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\UserActivity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserActivity>
 */
class UserActivityFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'action' => fake()->randomElement(['Viewed profile settings', 'Updated profile', 'Visited home']),
            'route_name' => fake()->randomElement(['profile.edit', 'profile.update', 'home']),
            'method' => fake()->randomElement(['GET', 'PATCH']),
            'path' => fake()->randomElement(['/settings/profile', '/home']),
            'status_code' => fake()->randomElement([200, 302]),
            'user_agent' => fake()->userAgent(),
            'context' => [
                'query' => [],
                'full_url' => fake()->url(),
            ],
        ];
    }
}
