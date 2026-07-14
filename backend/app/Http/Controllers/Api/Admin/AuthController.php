<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $admin = Admin::query()->where('email', $data['email'])->first();

        if (! $admin || ! Hash::check($data['password'], $admin->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid admin credentials.'],
            ]);
        }

        $admin->tokens()->where('name', 'cupid-admin')->delete();
        $token = $admin->createToken('cupid-admin')->plainTextToken;

        return response()->json([
            'token' => $token,
            'admin' => $this->payload($admin),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var Admin $admin */
        $admin = $request->user();

        return response()->json([
            'admin' => $this->payload($admin),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    private function payload(Admin $admin): array
    {
        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
        ];
    }
}
