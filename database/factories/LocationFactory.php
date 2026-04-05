<?php

namespace Database\Factories;

use App\Models\Location;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Location>
 */
class LocationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->city(),
            'country' => fake()->randomElement([
                'United Kingdom',
                'Germany',
                'France',
                'Netherlands',
                'United States',
                'Canada',
                'Singapore',
                'Australia',
                'Japan',
            ]),
        ];
    }
}
