<?php

namespace App\Services;

use App\Models\Interest;
use App\Models\Like;
use App\Models\Photo;
use App\Models\Preference;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class TelegramAuthService
{
    public function assertDemoAuthEnabled(): void
    {
        if (! app()->environment('local') || ! config('services.telegram.mock_auth')) {
            throw ValidationException::withMessages([
                'auth' => ['Demo sign in is only available in local development.'],
            ]);
        }
    }

    public function loginDemo(string $username, string $password): User
    {
        $this->assertDemoAuthEnabled();

        $user = User::query()
            ->whereRaw('LOWER(username) = ?', [strtolower($username)])
            ->first();

        if (! $user || ! $user->password || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['Invalid username or password.'],
            ]);
        }

        if (in_array($user->status, ['suspended', 'banned'], true)) {
            throw ValidationException::withMessages([
                'account' => ['Your account is not allowed to access Cupid ET.'],
            ]);
        }

        $user->forceFill(['last_active' => now()])->save();

        return $user;
    }

    public function registerDemo(array $payload): User
    {
        $this->assertDemoAuthEnabled();

        $username = strtolower(trim((string) $payload['username']));
        if (User::query()->whereRaw('LOWER(username) = ?', [$username])->exists()) {
            throw ValidationException::withMessages([
                'username' => ['That username is already taken.'],
            ]);
        }

        $telegramId = (int) (900000 + random_int(1000, 999999));
        while (User::query()->where('telegram_id', $telegramId)->exists()) {
            $telegramId = (int) (900000 + random_int(1000, 999999));
        }

        return User::query()->create([
            'telegram_id' => $telegramId,
            'username' => $username,
            'first_name' => $payload['first_name'],
            'last_name' => $payload['last_name'] ?? null,
            'password' => $payload['password'],
            'photo_url' => null,
            'status' => 'active',
            'verified' => false,
            'last_active' => now(),
        ]);
    }

    public function ensureDemoUser(): User
    {
        $user = User::query()->updateOrCreate(
            ['telegram_id' => 9001],
            [
                'username' => 'demo',
                'first_name' => 'Abebe',
                'last_name' => 'Kebede',
                'password' => 'demo1234',
                'photo_url' => 'https://commons.wikimedia.org/wiki/Special:FilePath/Ethiopian_man_portrait.jpg?width=600',
                'status' => 'active',
                'verified' => true,
                'last_active' => now(),
            ]
        );

        Profile::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'name' => 'Abebe Kebede',
                'birth_date' => now()->subYears(26)->toDateString(),
                'gender' => 'male',
                'location' => 'Addis Ababa',
                'latitude' => 9.0320,
                'longitude' => 38.7469,
                'bio' => 'Coffee lover from Addis. Looking for a meaningful Habesha connection.',
                'relationship_goal' => 'serious',
            ]
        );

        Photo::query()->updateOrCreate(
            ['user_id' => $user->id, 'is_primary' => true],
            [
                'image_url' => 'https://commons.wikimedia.org/wiki/Special:FilePath/Ethiopian_man_portrait.jpg?width=600',
                'path' => null,
                'status' => 'approved',
            ]
        );

        Preference::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'preferred_gender' => 'female',
                'min_age' => 20,
                'max_age' => 35,
                'preferred_location' => null,
                'max_distance_km' => 120,
            ]
        );

        $interestIds = Interest::query()->whereIn('name', ['Music', 'Travel', 'Coffee', 'Food', 'Fitness'])->pluck('id');
        if ($interestIds->isNotEmpty()) {
            $user->interests()->sync($interestIds);
        }

        foreach ([1001, 1003, 1005] as $telegramId) {
            $sender = User::query()->where('telegram_id', $telegramId)->first();
            if ($sender) {
                Like::query()->firstOrCreate([
                    'sender_id' => $sender->id,
                    'receiver_id' => $user->id,
                ]);
            }
        }

        return $user->fresh(['profile', 'photos', 'interests', 'preferences']);
    }

    public function authenticate(string $initData): User
    {
        $data = $this->parseInitData($initData);
        $this->verifySignature($data, $initData);
        $this->assertFresh($data);

        $telegramUser = json_decode($data['user'] ?? '{}', true);
        if (! is_array($telegramUser) || empty($telegramUser['id'])) {
            throw ValidationException::withMessages([
                'initData' => ['Telegram user payload is missing.'],
            ]);
        }

        $user = User::query()->updateOrCreate(
            ['telegram_id' => $telegramUser['id']],
            [
                'username' => $telegramUser['username'] ?? null,
                'first_name' => $telegramUser['first_name'] ?? null,
                'last_name' => $telegramUser['last_name'] ?? null,
                'photo_url' => $telegramUser['photo_url'] ?? null,
                'last_active' => now(),
            ]
        );

        if (in_array($user->status, ['suspended', 'banned'], true)) {
            throw ValidationException::withMessages([
                'account' => ['Your account is not allowed to access Cupid ET.'],
            ]);
        }

        $this->syncTelegramProfile($user, $telegramUser);

        return $user->fresh(['profile', 'photos', 'interests', 'preferences']);
    }

    /**
     * Pull display name + profile photo from Telegram into Cupid ET.
     * Birthday is not available via Mini Apps — user confirms it in onboarding.
     */
    public function syncTelegramProfile(User $user, array $telegramUser): void
    {
        $displayName = trim(
            trim((string) ($telegramUser['first_name'] ?? $user->first_name ?? ''))
            .' '
            .trim((string) ($telegramUser['last_name'] ?? $user->last_name ?? ''))
        );

        if ($displayName === '') {
            $displayName = $user->username ? '@'.$user->username : 'Cupid user';
        }

        // Keep profile name in sync when a profile already exists
        if ($user->profile) {
            $user->profile->update([
                'name' => $displayName,
            ]);
        }

        $this->importTelegramPhoto($user, $telegramUser);
    }

    private function importTelegramPhoto(User $user, array $telegramUser): void
    {
        // Never replace photos the user already uploaded in-app
        if ($user->photos()->whereNotNull('path')->exists()) {
            return;
        }

        $photoUrl = $telegramUser['photo_url'] ?? $user->photo_url;
        if (! $photoUrl) {
            $photoUrl = $this->fetchTelegramProfilePhotoUrl((int) ($telegramUser['id'] ?? $user->telegram_id));
        }

        if (! $photoUrl) {
            return;
        }

        $user->forceFill(['photo_url' => $photoUrl])->save();

        // Prefer downloading into local storage so discover cards stay stable
        $stored = $this->downloadRemotePhoto($user, $photoUrl);

        if ($stored) {
            $user->photos()->whereNull('path')->delete();
            $already = $user->photos()->where('path', $stored['path'])->exists();
            if (! $already) {
                $user->photos()->update(['is_primary' => false]);
                $user->photos()->create([
                    'image_url' => $stored['url'],
                    'path' => $stored['path'],
                    'is_primary' => true,
                    'status' => config('cupid.auto_approve_photos', true) ? 'approved' : 'pending',
                ]);
            }

            return;
        }

        if (! $user->photos()->where('image_url', $photoUrl)->exists()) {
            $user->photos()->whereNull('path')->delete();
            $user->photos()->update(['is_primary' => false]);
            $user->photos()->create([
                'image_url' => $photoUrl,
                'path' => null,
                'is_primary' => true,
                'status' => 'approved',
            ]);
        }
    }

    private function fetchTelegramProfilePhotoUrl(int $telegramId): ?string
    {
        $token = config('services.telegram.bot_token');
        if (! $token || $telegramId <= 0) {
            return null;
        }

        try {
            $photos = Http::timeout(8)->get("https://api.telegram.org/bot{$token}/getUserProfilePhotos", [
                'user_id' => $telegramId,
                'limit' => 1,
            ])->json();

            $sizes = $photos['result']['photos'][0] ?? null;
            if (! is_array($sizes) || $sizes === []) {
                return null;
            }

            $best = collect($sizes)->sortByDesc(fn ($size) => (int) ($size['file_size'] ?? 0))->first();
            $fileId = $best['file_id'] ?? null;

            if (! $fileId) {
                return null;
            }

            $file = Http::timeout(8)->get("https://api.telegram.org/bot{$token}/getFile", [
                'file_id' => $fileId,
            ])->json();

            $filePath = $file['result']['file_path'] ?? null;
            if (! $filePath) {
                return null;
            }

            return "https://api.telegram.org/file/bot{$token}/{$filePath}";
        } catch (\Throwable $e) {
            Log::warning('Failed to fetch Telegram profile photo', [
                'telegram_id' => $telegramId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * @return array{path: string, url: string}|null
     */
    private function downloadRemotePhoto(User $user, string $url): ?array
    {
        try {
            $response = Http::timeout(12)->get($url);
            if (! $response->successful()) {
                return null;
            }

            $binary = $response->body();
            if ($binary === '' || strlen($binary) < 100) {
                return null;
            }

            $disk = config('filesystems.cupid_disk', 'public');
            $path = 'photos/'.$user->id.'/telegram_'.md5($url).'.jpg';
            Storage::disk($disk)->put($path, $binary);

            $publicUrl = $disk === 's3' || $disk === 'r2'
                ? Storage::disk($disk)->url($path)
                : Storage::disk('public')->url($path);

            return ['path' => $path, 'url' => $publicUrl];
        } catch (\Throwable $e) {
            Log::warning('Failed to download Telegram photo', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    public function authenticateMock(array $payload): User
    {
        if (! app()->environment('local') || ! config('services.telegram.mock_auth')) {
            throw ValidationException::withMessages([
                'initData' => ['Mock auth is disabled.'],
            ]);
        }

        $telegramId = (int) ($payload['telegram_id'] ?? 0);
        if ($telegramId <= 0) {
            throw ValidationException::withMessages([
                'telegram_id' => ['A valid telegram_id is required for mock auth.'],
            ]);
        }

        $user = User::query()->updateOrCreate(
            ['telegram_id' => $telegramId],
            [
                'username' => $payload['username'] ?? 'demo_user',
                'first_name' => $payload['first_name'] ?? 'Demo',
                'last_name' => $payload['last_name'] ?? 'User',
                'photo_url' => $payload['photo_url'] ?? null,
                'last_active' => now(),
                'status' => 'active',
            ]
        );

        $this->syncTelegramProfile($user, [
            'id' => $telegramId,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'username' => $user->username,
            'photo_url' => $user->photo_url,
        ]);

        return $user->fresh(['profile', 'photos', 'interests', 'preferences']);
    }

    private function parseInitData(string $initData): array
    {
        parse_str($initData, $data);

        if (empty($data['hash'])) {
            throw ValidationException::withMessages([
                'initData' => ['Missing Telegram hash.'],
            ]);
        }

        return $data;
    }

    private function verifySignature(array $data, string $initData): void
    {
        $botToken = config('services.telegram.bot_token');
        if (! $botToken) {
            throw ValidationException::withMessages([
                'initData' => ['Telegram bot token is not configured.'],
            ]);
        }

        $checkHash = $data['hash'];
        unset($data['hash']);
        ksort($data);

        $dataCheckString = collect($data)
            ->map(fn ($value, $key) => $key.'='.$value)
            ->implode("\n");

        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $calculatedHash = bin2hex(hash_hmac('sha256', $dataCheckString, $secretKey, true));

        if (! hash_equals($calculatedHash, $checkHash)) {
            Log::warning('Telegram initData signature mismatch', ['initData' => $initData]);
            throw ValidationException::withMessages([
                'initData' => ['Invalid Telegram signature.'],
            ]);
        }
    }

    private function assertFresh(array $data): void
    {
        $authDate = (int) ($data['auth_date'] ?? 0);
        $maxAge = (int) config('services.telegram.auth_max_age', 86400);

        if ($authDate <= 0 || (time() - $authDate) > $maxAge) {
            throw ValidationException::withMessages([
                'initData' => ['Telegram auth data has expired.'],
            ]);
        }
    }
}
