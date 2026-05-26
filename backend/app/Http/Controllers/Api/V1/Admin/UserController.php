<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $users = User::latest()->limit(200)->get()->map(fn ($u) => [
            'id' => 'user_' . $u->id,
            'email' => $u->email,
            'name' => $u->name,
            'first_name' => $u->first_name,
            'last_name' => $u->last_name,
            'role' => match ($u->role?->value) {
                'admin' => 'admin',
                'seller' => 'seller',
                default => 'buyer',
            },
            'is_active' => $u->is_active,
            'created_at' => $u->created_at?->toIso8601String(),
        ]);

        return $this->success($users);
    }

    public function update(Request $request, string $id)
    {
        $user = User::findOrFail((int) preg_replace('/\D/', '', $id));
        $user->update($request->validate([
            'is_active' => 'sometimes|boolean',
        ]));

        return $this->success(null, 'User updated');
    }
}
