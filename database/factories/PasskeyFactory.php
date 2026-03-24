<?php

namespace Database\Factories;

use App\Models\Passkey;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Passkey>
 */
class PasskeyFactory extends Factory
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
            'name' => 'Passkey '.fake()->randomNumber(3),
            'credential_id' => Str::random(64),
            'public_key' => fake()->text(120),
            'aaguid' => fake()->optional()->uuid(),
            'transports' => ['internal'],
            'counter' => 0,
            'last_used_at' => null,
        ];
    }
}
