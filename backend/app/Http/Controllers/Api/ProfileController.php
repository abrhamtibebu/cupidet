<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Interest;
use App\Models\ProfilePrompt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['profile', 'photos', 'interests', 'preferences', 'prompts']);

        return response()->json([
            'user' => $this->userPayload($user),
            'onboarding_complete' => $user->hasCompletedProfile(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        return $this->upsert($request);
    }

    public function update(Request $request): JsonResponse
    {
        return $this->upsert($request);
    }

    public function interests(): JsonResponse
    {
        return response()->json([
            'interests' => Interest::query()->orderBy('name')->get(),
        ]);
    }

    public function promptsCatalog(): JsonResponse
    {
        $prompts = collect(config('cupid.prompts', []))
            ->map(fn (string $label, string $key) => [
                'key' => $key,
                'label' => $label,
            ])
            ->values();

        return response()->json([
            'prompts' => $prompts,
            'languages' => config('cupid.languages', []),
            'relationship_goals' => collect(config('cupid.relationship_goals', []))
                ->map(fn (string $label, string $id) => ['id' => $id, 'label' => $label])
                ->values(),
            'children_options' => config('cupid.children_options', []),
            'pets_options' => config('cupid.pets_options', []),
            'drinking_options' => config('cupid.drinking_options', []),
            'smoking_options' => config('cupid.smoking_options', []),
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Account deleted.']);
    }

    public function hide(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->update([
            'status' => $user->status === 'hidden' ? 'active' : 'hidden',
        ]);

        return response()->json([
            'status' => $user->status,
            'message' => $user->status === 'hidden' ? 'Profile hidden.' : 'Profile visible.',
        ]);
    }

    private function upsert(Request $request): JsonResponse
    {
        $user = $request->user();
        $promptKeys = array_keys(config('cupid.prompts', []));
        $languages = config('cupid.languages', []);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'birth_date' => ['required', 'date', 'before:-18 years'],
            'gender' => ['required', Rule::in(['male', 'female', 'other'])],
            'location' => ['nullable', 'string', 'max:120'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'bio' => ['nullable', 'string', 'max:500'],
            'relationship_goal' => ['nullable', Rule::in(array_keys(config('cupid.relationship_goals', [])))],
            'height_cm' => ['nullable', 'integer', 'min:120', 'max:230'],
            'education' => ['nullable', 'string', 'max:120'],
            'occupation' => ['nullable', 'string', 'max:120'],
            'religion' => ['nullable', 'string', 'max:80'],
            'languages' => ['nullable', 'array', 'max:8'],
            'languages.*' => ['string', Rule::in($languages)],
            'children' => ['nullable', Rule::in(config('cupid.children_options', []))],
            'pets' => ['nullable', Rule::in(config('cupid.pets_options', []))],
            'drinking' => ['nullable', Rule::in(config('cupid.drinking_options', []))],
            'smoking' => ['nullable', Rule::in(config('cupid.smoking_options', []))],
            'hobbies' => ['nullable', 'array', 'max:12'],
            'hobbies.*' => ['string', 'max:40'],
            'prompts' => ['nullable', 'array', 'max:3'],
            'prompts.*.prompt_key' => ['required_with:prompts', 'string', Rule::in($promptKeys)],
            'prompts.*.answer' => ['required_with:prompts', 'string', 'max:150'],
            'interest_ids' => ['nullable', 'array'],
            'interest_ids.*' => ['integer', 'exists:interests,id'],
            'preferred_gender' => ['nullable', Rule::in(['male', 'female', 'any'])],
            'min_age' => ['nullable', 'integer', 'min:18', 'max:99'],
            'max_age' => ['nullable', 'integer', 'min:18', 'max:99'],
            'preferred_location' => ['nullable', 'string', 'max:120'],
            'max_distance_km' => ['nullable', 'integer', 'min:1', 'max:500'],
            'preferred_languages' => ['nullable', 'array', 'max:8'],
            'preferred_languages.*' => ['string', Rule::in($languages)],
            'preferred_interest_ids' => ['nullable', 'array', 'max:15'],
            'preferred_interest_ids.*' => ['integer', 'exists:interests,id'],
        ]);

        DB::transaction(function () use ($user, $data) {
            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => $data['name'],
                    'birth_date' => $data['birth_date'],
                    'gender' => $data['gender'],
                    'location' => $data['location'] ?? null,
                    'latitude' => $data['latitude'] ?? null,
                    'longitude' => $data['longitude'] ?? null,
                    'bio' => $data['bio'] ?? null,
                    'relationship_goal' => $data['relationship_goal'] ?? null,
                    'height_cm' => $data['height_cm'] ?? null,
                    'education' => $data['education'] ?? null,
                    'occupation' => $data['occupation'] ?? null,
                    'religion' => $data['religion'] ?? null,
                    'languages' => $data['languages'] ?? null,
                    'children' => $data['children'] ?? null,
                    'pets' => $data['pets'] ?? null,
                    'drinking' => $data['drinking'] ?? null,
                    'smoking' => $data['smoking'] ?? null,
                    'hobbies' => $data['hobbies'] ?? null,
                ]
            );

            if (array_key_exists('interest_ids', $data)) {
                $user->interests()->sync($data['interest_ids'] ?? []);
            }

            if (array_key_exists('prompts', $data)) {
                $this->syncPrompts($user->id, $data['prompts'] ?? []);
            }

            $prefTouched = isset($data['preferred_gender'])
                || isset($data['min_age'])
                || isset($data['max_age'])
                || array_key_exists('preferred_location', $data)
                || isset($data['max_distance_km'])
                || array_key_exists('preferred_languages', $data)
                || array_key_exists('preferred_interest_ids', $data)
                || array_key_exists('relationship_goal', $data);

            if ($prefTouched) {
                $preferredGender = $data['preferred_gender'] ?? $user->preferences?->preferred_gender ?? 'any';
                $goal = $data['relationship_goal'] ?? $user->profile?->relationship_goal;
                $gender = $data['gender'] ?? $user->profile?->gender;

                // Casual dating → show opposite gender only
                if ($goal === 'casual') {
                    if ($gender === 'male') {
                        $preferredGender = 'female';
                    } elseif ($gender === 'female') {
                        $preferredGender = 'male';
                    }
                }

                $existing = $user->preferences;
                $minAge = max(18, (int) ($data['min_age'] ?? $existing?->min_age ?? 18));
                $maxAge = max($minAge, (int) ($data['max_age'] ?? $existing?->max_age ?? 50));

                $user->preferences()->updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'preferred_gender' => $preferredGender,
                        'min_age' => $minAge,
                        'max_age' => $maxAge,
                        'preferred_location' => array_key_exists('preferred_location', $data)
                            ? ($data['preferred_location'] ?: null)
                            : ($existing?->preferred_location),
                        'max_distance_km' => $data['max_distance_km'] ?? $existing?->max_distance_km ?? 50,
                        'preferred_languages' => array_key_exists('preferred_languages', $data)
                            ? ($data['preferred_languages'] ?: null)
                            : ($existing?->preferred_languages),
                        'preferred_interest_ids' => array_key_exists('preferred_interest_ids', $data)
                            ? ($data['preferred_interest_ids'] ?: null)
                            : ($existing?->preferred_interest_ids),
                    ]
                );
            }
        });

        $user->load(['profile', 'photos', 'interests', 'preferences', 'prompts']);

        return response()->json([
            'user' => $this->userPayload($user),
            'onboarding_complete' => $user->hasCompletedProfile(),
        ]);
    }

    private function syncPrompts(int $userId, array $prompts): void
    {
        $keys = [];
        foreach ($prompts as $prompt) {
            $key = $prompt['prompt_key'];
            $keys[] = $key;
            ProfilePrompt::query()->updateOrCreate(
                ['user_id' => $userId, 'prompt_key' => $key],
                ['answer' => trim($prompt['answer'])]
            );
        }

        $query = ProfilePrompt::query()->where('user_id', $userId);
        if (count($keys) > 0) {
            $query->whereNotIn('prompt_key', $keys);
        }
        $query->delete();
    }

    private function userPayload($user): array
    {
        $catalog = config('cupid.prompts', []);

        return [
            'id' => $user->id,
            'telegram_id' => $user->telegram_id,
            'username' => $user->username,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'photo_url' => $user->photo_url,
            'status' => $user->status,
            'verified' => (bool) $user->verified,
            'notify_matches' => (bool) $user->notify_matches,
            'notify_likes' => (bool) $user->notify_likes,
            'notify_messages' => (bool) $user->notify_messages,
            'profile' => $user->profile,
            'photos' => $user->photos,
            'interests' => $user->interests,
            'preferences' => $user->preferences,
            'prompts' => $user->prompts->map(fn (ProfilePrompt $p) => [
                'prompt_key' => $p->prompt_key,
                'label' => $catalog[$p->prompt_key] ?? $p->prompt_key,
                'answer' => $p->answer,
            ])->values(),
        ];
    }
}
