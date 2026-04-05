<?php

namespace Database\Factories;

use App\Models\Location;
use App\Models\Node;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Node>
 */
class NodeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'location_id' => Location::factory(),
            'name' => fake()->unique()->city().' Node',
            'fqdn' => fake()->unique()->domainName(),
            'daemon_port' => 2800,
            'sftp_port' => 3128,
            'use_ssl' => fake()->boolean(),
        ];
    }
}
