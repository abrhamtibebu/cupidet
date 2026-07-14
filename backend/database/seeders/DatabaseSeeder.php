<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Interest;
use App\Models\Like;
use App\Models\MatchModel;
use App\Models\Message;
use App\Models\Photo;
use App\Models\Preference;
use App\Models\Profile;
use App\Models\User;
use App\Services\TelegramAuthService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(InterestSeeder::class);

        Admin::query()->updateOrCreate(
            ['email' => 'admin@cupidet.com'],
            [
                'name' => 'Mingle 251 Admin',
                'password' => Hash::make('password'),
            ]
        );

        if (! app()->environment('local')) {
            return;
        }

        $interestIds = Interest::query()->pluck('id');
        $coords = [
            'Addis Ababa' => [9.0320, 38.7469],
            'Bahir Dar' => [11.5742, 37.3614],
            'Mekelle' => [13.4967, 39.4753],
            'Hawassa' => [7.0621, 38.4760],
            'Dire Dawa' => [9.6009, 41.8501],
            'Gondar' => [12.6030, 37.4521],
        ];

        $goals = ['casual', 'serious', 'friendship', 'figuring_out', 'long_term'];
        $bios = [
            'Habesha soul looking for genuine connection. Love coffee, music, and good conversation.',
            'Weekend explorer. Injera, jazz, and late-night talks.',
            'Building something of my own. Looking for someone real.',
            'Coffee ceremonies, city walks, and spontaneous trips.',
            'Soft life energy. Let’s match if you love good food and better company.',
            'Faith, family, and fitness. Open to something serious.',
        ];

        // Habesha / Ethiopian portraits from Unsplash + Wikimedia Commons.
        $habeshaFemale = [
            'https://images.unsplash.com/photo-1623038455007-891466ff6016?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1534470717-233b39a41c54?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1630135485071-ecbd06865017?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1598122666068-59b41e0a3193?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1528275286191-fa6d2ec8298e?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1743871698163-a2e470d8eac7?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1650886541200-d79dd0b54255?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1598554563873-55ef9dd8428b?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1672940768805-ccf79e870ef7?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1598690118434-ffb348abe024?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1598799876088-d0a72f6df1f6?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1686902711018-03d075fbd77b?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1674553101741-5f5302a8c355?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1686902444184-c8f6ca060586?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1756137842437-afa5eb24da82?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1756137842351-08daa88ae187?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1756137842741-defe28142347?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1756137972811-703e4143c039?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1756137941864-6ae77d21f91b?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1756137842485-e18946225b96?auto=format&fit=crop&w=600&h=800&q=80',
        ];

        // Prefer Unsplash (Gift Habeshaw et al.) + a few Wikimedia Special:FilePath portraits.
        $habeshaMale = [
            'https://images.unsplash.com/photo-1543580786-f37bd21c4966?auto=format&fit=crop&w=600&h=800&q=80',
            'https://images.unsplash.com/photo-1533636721434-0e2d61030955?auto=format&fit=crop&w=600&h=800&q=80',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Ethiopian_man_portrait.jpg?width=600',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Oromo_Man,_Ethiopia_(8134606273).jpg?width=600',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Oromo_Man,_Ethiopia_(16313208374).jpg?width=600',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Adigrat_Man,_Ethiopia_(16147172736).jpg?width=600',
            'https://commons.wikimedia.org/wiki/Special:FilePath/Chat_Man,_Harar,_Ethiopia_(8102213290).jpg?width=600',
            'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Ethiopian_man_in_window.jpg/800px-Ethiopian_man_in_window.jpg',
            'https://upload.wikimedia.org/wikipedia/commons/2/2b/Adigrat_Man%2C_Ethiopia_%2816147172736%29.jpg',
            'https://upload.wikimedia.org/wikipedia/commons/a/a5/Chat_Man%2C_Harar%2C_Ethiopia_%288102213290%29.jpg',
            'https://images.unsplash.com/photo-1543580786-f37bd21c4966?auto=format&fit=crop&w=600&h=900&q=80&crop=faces',
            'https://images.unsplash.com/photo-1533636721434-0e2d61030955?auto=format&fit=crop&w=600&h=900&q=80&crop=faces',
        ];

        $named = [
            ['telegram_id' => 1001, 'username' => 'selam_a', 'first_name' => 'Selam', 'name' => 'Selam', 'gender' => 'female', 'location' => 'Addis Ababa', 'goal' => 'serious'],
            ['telegram_id' => 1002, 'username' => 'yonas_b', 'first_name' => 'Yonas', 'name' => 'Yonas', 'gender' => 'male', 'location' => 'Addis Ababa', 'goal' => 'casual'],
            ['telegram_id' => 1003, 'username' => 'hiba_c', 'first_name' => 'Hiba', 'name' => 'Hiba', 'gender' => 'female', 'location' => 'Bahir Dar', 'goal' => 'friendship'],
            ['telegram_id' => 1004, 'username' => 'dawit_d', 'first_name' => 'Dawit', 'name' => 'Dawit', 'gender' => 'male', 'location' => 'Mekelle', 'goal' => 'figuring_out'],
            ['telegram_id' => 1005, 'username' => 'liya_e', 'first_name' => 'Liya', 'name' => 'Liya', 'gender' => 'female', 'location' => 'Addis Ababa', 'goal' => 'casual'],
            ['telegram_id' => 1006, 'username' => 'abel_f', 'first_name' => 'Abel', 'name' => 'Abel', 'gender' => 'male', 'location' => 'Hawassa', 'goal' => 'serious'],
            ['telegram_id' => 1007, 'username' => 'meron_g', 'first_name' => 'Meron', 'name' => 'Meron', 'gender' => 'female', 'location' => 'Addis Ababa', 'goal' => 'casual'],
            ['telegram_id' => 1008, 'username' => 'sara_h', 'first_name' => 'Sara', 'name' => 'Sara', 'gender' => 'female', 'location' => 'Addis Ababa', 'goal' => 'serious'],
            ['telegram_id' => 1009, 'username' => 'betty_i', 'first_name' => 'Betty', 'name' => 'Betty', 'gender' => 'female', 'location' => 'Addis Ababa', 'goal' => 'figuring_out'],
            ['telegram_id' => 1010, 'username' => 'helen_j', 'first_name' => 'Helen', 'name' => 'Helen', 'gender' => 'female', 'location' => 'Addis Ababa', 'goal' => 'friendship'],
            ['telegram_id' => 1011, 'username' => 'rahel_k', 'first_name' => 'Rahel', 'name' => 'Rahel', 'gender' => 'female', 'location' => 'Addis Ababa', 'goal' => 'casual'],
            ['telegram_id' => 1012, 'username' => 'marta_l', 'first_name' => 'Marta', 'name' => 'Marta', 'gender' => 'female', 'location' => 'Addis Ababa', 'goal' => 'serious'],
            ['telegram_id' => 1013, 'username' => 'nati_m', 'first_name' => 'Nati', 'name' => 'Nati', 'gender' => 'male', 'location' => 'Addis Ababa', 'goal' => 'casual'],
            ['telegram_id' => 1014, 'username' => 'kidist_n', 'first_name' => 'Kidist', 'name' => 'Kidist', 'gender' => 'female', 'location' => 'Addis Ababa', 'goal' => 'long_term'],
        ];

        $extraFemale = [
            'Eden', 'Hanna', 'Ruth', 'Sofia', 'Naomi', 'Lensa', 'Blen', 'Mahi',
            'Tsion', 'Yordanos', 'Rediet', 'Saron', 'Hiwot', 'Feven', 'Eyerusalem',
            'Mekdes', 'Bezawit', 'Samrawit', 'Gelila', 'Birukti', 'Seble', 'Tigist',
            'Mahlet', 'Nardos', 'Eyerus', 'Kalkidan', 'Amen', 'Soliyana', 'Hasset', 'Eman',
        ];

        $extraMale = [
            'Bereket', 'Nahom', 'Elias', 'Kirubel', 'Robel', 'Mikias', 'Henok', 'Amanuel',
            'Yonathan', 'Biruk', 'Leul', 'Eyob', 'Surafel', 'Dagim', 'Nathnael',
        ];

        $locationsNear = ['Addis Ababa', 'Addis Ababa', 'Addis Ababa', 'Addis Ababa', 'Hawassa', 'Dire Dawa', 'Bahir Dar', 'Gondar'];

        $demos = $named;
        $tid = 1100;
        foreach ($extraFemale as $i => $name) {
            $loc = $locationsNear[$i % count($locationsNear)];
            $slug = strtolower(preg_replace('/[^a-z]/i', '', $name)).'_f'.$i;
            $demos[] = [
                'telegram_id' => $tid++,
                'username' => $slug,
                'first_name' => $name,
                'name' => $name,
                'gender' => 'female',
                'location' => $loc,
                'goal' => $goals[$i % count($goals)],
            ];
        }
        foreach ($extraMale as $i => $name) {
            $loc = $locationsNear[$i % count($locationsNear)];
            $slug = strtolower(preg_replace('/[^a-z]/i', '', $name)).'_m'.$i;
            $demos[] = [
                'telegram_id' => $tid++,
                'username' => $slug,
                'first_name' => $name,
                'name' => $name,
                'gender' => 'male',
                'location' => $loc,
                'goal' => $goals[$i % count($goals)],
            ];
        }

        $femaleIndex = 0;
        $maleIndex = 0;

        foreach ($demos as $i => $demo) {
            if ($demo['gender'] === 'female') {
                $pool = $habeshaFemale;
                $idx = $femaleIndex++;
            } else {
                $pool = $habeshaMale;
                $idx = $maleIndex++;
            }
            $primaryUrl = $pool[$idx % count($pool)];
            $altUrl = $pool[($idx + 7) % count($pool)];

            $user = User::query()->updateOrCreate(
                ['telegram_id' => $demo['telegram_id']],
                [
                    'username' => $demo['username'],
                    'first_name' => $demo['first_name'],
                    'last_name' => 'Demo',
                    'photo_url' => $primaryUrl,
                    'status' => 'active',
                    'verified' => $i % 3 === 0,
                    'last_active' => now()->subMinutes(($i % 12) * 2),
                ]
            );

            [$lat, $lng] = $coords[$demo['location']] ?? [9.03, 38.74];
            $ageYears = 21 + ($i % 14);

            Profile::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => $demo['name'],
                    'birth_date' => now()->subYears($ageYears)->subMonths($i % 11)->toDateString(),
                    'gender' => $demo['gender'],
                    'location' => $demo['location'],
                    'latitude' => $lat + (($i % 7) * 0.012) - 0.03,
                    'longitude' => $lng + (($i % 5) * 0.014) - 0.02,
                    'bio' => $bios[$i % count($bios)],
                    'relationship_goal' => $demo['goal'],
                ]
            );

            Photo::query()->where('user_id', $user->id)->delete();
            Photo::query()->create([
                'user_id' => $user->id,
                'image_url' => $primaryUrl,
                'path' => null,
                'is_primary' => true,
                'status' => 'approved',
            ]);
            Photo::query()->create([
                'user_id' => $user->id,
                'image_url' => $altUrl,
                'path' => null,
                'is_primary' => false,
                'status' => 'approved',
            ]);

            Preference::query()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'preferred_gender' => $demo['gender'] === 'male' ? 'female' : 'male',
                    'min_age' => 20,
                    'max_age' => 40,
                    'preferred_location' => null,
                    'max_distance_km' => 120,
                ]
            );

            $user->interests()->sync($interestIds->random(min(5, $interestIds->count()))->values()->all());
        }

        $demoUser = app(TelegramAuthService::class)->ensureDemoUser();

        // Ready match + chat with Selam for the demo account.
        $selam = User::query()->where('telegram_id', 1001)->first();
        if ($selam && $demoUser) {
            Like::query()->updateOrCreate(
                ['sender_id' => $selam->id, 'receiver_id' => $demoUser->id],
                ['type' => 'like']
            );
            Like::query()->updateOrCreate(
                ['sender_id' => $demoUser->id, 'receiver_id' => $selam->id],
                ['type' => 'like']
            );

            [$one, $two] = MatchModel::orderedPair($demoUser->id, $selam->id);
            $match = MatchModel::query()->firstOrCreate(
                ['user_one' => $one, 'user_two' => $two],
                ['matched_at' => now()->subHour()]
            );

            if (! Message::query()->where('match_id', $match->id)->exists()) {
                Message::query()->create([
                    'match_id' => $match->id,
                    'sender_id' => $selam->id,
                    'body' => 'Hey Abebe! Great to match with you.',
                    'created_at' => now()->subMinutes(40),
                    'updated_at' => now()->subMinutes(40),
                ]);
                Message::query()->create([
                    'match_id' => $match->id,
                    'sender_id' => $demoUser->id,
                    'body' => 'Hi Selam! How’s your week going?',
                    'created_at' => now()->subMinutes(35),
                    'updated_at' => now()->subMinutes(35),
                ]);
                Message::query()->create([
                    'match_id' => $match->id,
                    'sender_id' => $selam->id,
                    'body' => 'Good! Coffee in Bole sometime?',
                    'created_at' => now()->subMinutes(30),
                    'updated_at' => now()->subMinutes(30),
                ]);
            }
        }
    }
}
