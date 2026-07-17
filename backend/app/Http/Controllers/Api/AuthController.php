<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TelegramAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function telegram(Request $request, TelegramAuthService $auth): JsonResponse
    {
        if ($request->boolean('mock') || (! $request->filled('initData') && config('services.telegram.mock_auth'))) {
            $user = $auth->authenticateMock($request->all());
        } else {
            $validated = $request->validate([
                'initData' => ['required', 'string'],
            ]);
            $user = $auth->authenticate($validated['initData']);
        }

        return $this->tokenResponse($user);
    }

    public function login(Request $request, TelegramAuthService $auth): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'max:50'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = $auth->loginWithPassword($data['username'], $data['password']);

        return $this->tokenResponse($user);
    }

    public function register(Request $request, TelegramAuthService $auth): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'alpha_dash', 'min:3', 'max:30'],
            'first_name' => ['required', 'string', 'max:50'],
            'last_name' => ['nullable', 'string', 'max:50'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = $auth->registerWithPassword($data);

        return $this->tokenResponse($user, 201);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! in_array($user->status, ['suspended', 'banned'], true)) {
            $user->forceFill(['last_active' => now()])->save();
        }

        $user->load(['profile', 'photos', 'interests', 'preferences', 'prompts']);
        $this->loadVerification($user);

        return response()->json([
            'user' => $this->userPayload($user),
            'onboarding_complete' => $user->hasCompletedProfile(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    public function updateNotifications(Request $request): JsonResponse
    {
        $data = $request->validate([
            'notify_matches' => ['sometimes', 'boolean'],
            'notify_likes' => ['sometimes', 'boolean'],
            'notify_messages' => ['sometimes', 'boolean'],
        ]);

        if ($data === []) {
            return response()->json([
                'message' => 'No notification fields provided.',
            ], 422);
        }

        $user = $request->user();
        $user->fill($data)->save();

        return response()->json([
            'user' => $this->userPayload($this->withVerification($user->fresh()->load(['profile', 'photos', 'interests', 'preferences', 'prompts']))),
        ]);
    }

    public function updateE2eKey(Request $request): JsonResponse
    {
        $data = $request->validate([
            'public_key' => ['required', 'string', 'max:2000'],
        ]);

        $request->user()->forceFill(['e2e_public_key' => $data['public_key']])->save();

        return response()->json(['ok' => true]);
    }

    private function withVerification($user)
    {
        $this->loadVerification($user);

        return $user;
    }

    private function tokenResponse($user, int $status = 200): JsonResponse
    {
        $user->tokens()->delete();
        $token = $user->createToken('cupid-et')->plainTextToken;
        $user->load(['profile', 'photos', 'interests', 'preferences', 'prompts']);
        $this->loadVerification($user);

        return response()->json([
            'token' => $token,
            'user' => $this->userPayload($user),
            'onboarding_complete' => $user->hasCompletedProfile(),
        ], $status);
    }

    private function loadVerification($user): void
    {
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('verification_requests')) {
                $user->load('latestVerificationRequest');
            }
        } catch (\Throwable) {
            // Never block auth if verification storage is unavailable.
        }
    }

    private function verificationPayload($user): ?array
    {
        $request = $user->latestVerificationRequest ?? null;
        if (! $request) {
            return null;
        }

        return [
            'id' => $request->id,
            'status' => $request->status,
            'selfie_url' => $request->selfie_url,
            'created_at' => optional($request->created_at)?->toIso8601String(),
            'reviewed_at' => optional($request->reviewed_at)?->toIso8601String(),
            'notes' => $request->notes,
        ];
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
            'verified' => $user->verified,
            'last_active' => $user->last_active,
            'notify_matches' => (bool) $user->notify_matches,
            'notify_likes' => (bool) $user->notify_likes,
            'notify_messages' => (bool) $user->notify_messages,
            'profile' => $user->profile,
            'photos' => $user->photos,
            'interests' => $user->interests,
            'preferences' => $user->preferences,
            'prompts' => $user->prompts->map(fn ($p) => [
                'prompt_key' => $p->prompt_key,
                'label' => $catalog[$p->prompt_key] ?? $p->prompt_key,
                'answer' => $p->answer,
            ])->values(),
            'verification_request' => $this->verificationPayload($user),
        ];
    }
}
