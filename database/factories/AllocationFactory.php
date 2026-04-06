<?php

namespace Database\Factories;

use App\Models\Allocation;
use App\Models\Node;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Allocation>
 */
class AllocationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'node_id' => Node::factory(),
            'bind_ip' => '0.0.0.0',
            'port' => fake()->unique()->numberBetween(25565, 40000),
            'ip_alias' => fake()->domainName(),
        ];
    }
}
