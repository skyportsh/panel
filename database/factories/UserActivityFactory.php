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
            'action' => fake()->randomElement(['Viewed profile settings', 'Updated billing settings', 'Visited home']),
            'route_name' => fake()->randomElement(['profile.edit', 'billing.update', 'home']),
            'method' => fake()->randomElement(['GET', 'PATCH']),
            'path' => fake()->randomElement(['/settings/profile', '/settings/billing', '/home']),
            'ip_address' => fake()->ipv4(),
            'country_code' => fake()->randomElement(['US', 'GB', 'CA']),
            'country_name' => fake()->randomElement(['United States', 'United Kingdom', 'Canada']),
            'status_code' => fake()->randomElement([200, 302]),
            'user_agent' => fake()->userAgent(),
            'context' => [
                'query' => [],
                'full_url' => fake()->url(),
            ],
        ];
    }
}
