<?php

namespace Database\Seeders;

use App\Models\Interest;
use Illuminate\Database\Seeder;

class InterestSeeder extends Seeder
{
    /** @return list<string> */
    public static function names(): array
    {
        return [
            'Music', 'Travel', 'Movies', 'Sports', 'Food',
            'Business', 'Technology', 'Fitness', 'Art', 'Coffee',
            'Photography', 'Dancing', 'Reading', 'Fashion', 'Gaming',
            'Church', 'Cooking', 'Nature', 'Startups', 'Humor',
        ];
    }

    public function run(): void
    {
        foreach (self::names() as $name) {
            Interest::query()->firstOrCreate(['name' => $name]);
        }
    }
}
