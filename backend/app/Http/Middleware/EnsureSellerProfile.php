<?php

namespace App\Http\Middleware;

use App\Enums\UserRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSellerProfile
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        if ($user->role === UserRole::Admin) {
            return $next($request);
        }

        $seller = $user->seller;

        if (!$seller || $seller->status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Approved seller profile required',
            ], 403);
        }

        return $next($request);
    }
}
