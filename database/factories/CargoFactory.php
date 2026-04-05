<?php

namespace Database\Factories;

use App\Models\Cargo;
use App\Services\CargoDefinitionService;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Cargo>
 */
class CargoFactory extends Factory
{
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);
        $author = fake()->safeEmail();
        $service = app(CargoDefinitionService::class);
        $compiled = $service->compile($service->starter([
            'name' => Str::title($name),
            'author' => $author,
            'description' => fake()->sentence(),
            'startup' => './start.sh',
        ]));

        return $compiled;
    }
}
