<?php

namespace Database\Factories;

use App\Models\Cargo;
use App\Models\Node;
use App\Models\Server;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Server>
 */
class ServerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'node_id' => Node::factory(),
            'cargo_id' => Cargo::factory(),
            'name' => fake()->unique()->words(2, true),
            'memory_mib' => fake()->randomElement([1024, 2048, 4096, 8192]),
            'cpu_limit' => fake()->randomElement([100, 200, 400]),
            'disk_mib' => fake()->randomElement([5120, 10240, 20480]),
            'status' => 'pending',
        ];
    }
}
