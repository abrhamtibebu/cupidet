<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user instanceof User && in_array($user->status, ['suspended', 'banned'], true)) {
            $status = $user->status;
            $message = $status === 'banned'
                ? 'Your account has been banned and can no longer use Mingle 251.'
                : 'Your account has been suspended. You cannot use Mingle 251 until it is restored.';

            return response()->json([
                'message' => $message,
                'code' => 'account_restricted',
                'status' => $status,
            ], 403);
        }

        return $next($request);
    }
}
