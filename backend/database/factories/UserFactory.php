<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    public function definition(): array
    {
        return [
            'telegram_id' => fake()->unique()->numberBetween(100000, 999999999),
            'username' => fake()->userName(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'photo_url' => null,
            'status' => 'active',
            'verified' => false,
            'last_active' => now(),
        ];
    }
}
