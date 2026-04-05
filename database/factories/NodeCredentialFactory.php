<?php

namespace Database\Factories;

use App\Models\Node;
use App\Models\NodeCredential;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<NodeCredential>
 */
class NodeCredentialFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'node_id' => Node::factory(),
            'enrollment_token_hash' => null,
            'enrollment_expires_at' => null,
            'enrollment_used_at' => null,
            'daemon_secret_hash' => null,
            'daemon_secret_issued_at' => null,
        ];
    }
}
