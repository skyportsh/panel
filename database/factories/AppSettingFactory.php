<?php

namespace Database\Factories;

use App\Models\AppSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AppSetting>
 */
class AppSettingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'key' => fake()->unique()->slug(2),
            'value' => fake()->words(2, true),
        ];
    }
}
