<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Seller;
use App\Models\User;
use App\Models\VendorRequest;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use ApiResponse;

    public function register(Request $request)
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', Password::min(8)->mixedCase()->numbers()],
            'role' => 'in:customer,seller,buyer',
        ]);

        $requested = $data['role'] ?? 'customer';
        $sellerApplication = $requested === 'seller';

        $user = User::create([
            'name' => trim($data['first_name'] . ' ' . $data['last_name']),
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => UserRole::Customer,
            'is_active' => true,
        ]);

        $user->assignRole('customer');

        try {
            event(new Registered($user));
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            report($e);
        }

        if ($sellerApplication) {
            VendorRequest::create([
                'user_id' => $user->id,
                'business_name' => $data['first_name'] . ' ' . $data['last_name'] . ' Store',
                'status' => 'pending',
            ]);
        }

        $token = $user->createToken('fashionx')->plainTextToken;

        $message = $sellerApplication
            ? 'Registration successful. Seller application is pending admin approval.'
            : 'Registration successful';

        return $this->success([
            'user' => $this->formatUser($user),
            'token' => $token,
            'seller_pending' => $sellerApplication,
        ], $message, 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return $this->error('Invalid email or password', 401);
        }

        if (!$user->is_active) {
            return $this->error('Account is disabled', 403);
        }

        $user->tokens()->delete();
        $token = $user->createToken('fashionx')->plainTextToken;

        return $this->success([
            'user' => $this->formatUser($user),
            'token' => $token,
        ], 'Login successful');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return $this->success(null, 'Logged out');
    }

    public function me(Request $request)
    {
        return $this->success($this->formatUser($request->user()->load('seller')));
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'first_name' => 'sometimes|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'phone' => 'nullable|string|max:20',
            'avatar' => 'nullable|url',
        ]);

        $user->update($data);
        if (isset($data['first_name']) || isset($data['last_name'])) {
            $user->update(['name' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''))]);
        }

        return $this->success($this->formatUser($user->fresh()), 'Profile updated');
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        try {
            $status = PasswordBroker::sendResetLink($request->only('email'));
        } catch (\Throwable $e) {
            report($e);
            return $this->error('Unable to send reset email right now. Try again later.', 503);
        }

        if ($status !== PasswordBroker::RESET_LINK_SENT) {
            return $this->success(null, 'If that email exists, a password reset link has been sent');
        }

        return $this->success(null, 'If that email exists, a password reset link has been sent');
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
        ]);

        $status = PasswordBroker::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete();
            }
        );

        if ($status !== PasswordBroker::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => [__($status)]]);
        }

        return $this->success(null, 'Password reset successful');
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->hasVerifiedEmail()) {
            return $this->success(null, 'Email already verified');
        }

        try {
            $user->sendEmailVerificationNotification();
        } catch (\Throwable $e) {
            report($e);
            return $this->error('Unable to send verification email right now. Try again later.', 503);
        }

        return $this->success(null, 'Verification email sent');
    }

    public function verifyEmail(Request $request, int $id, string $hash): JsonResponse
    {
        $user = User::findOrFail($id);

        if (!hash_equals($hash, sha1($user->getEmailForVerification()))) {
            return $this->error('Invalid verification link', 403);
        }

        if ($user->hasVerifiedEmail()) {
            return $this->success(null, 'Email already verified');
        }

        $user->markEmailAsVerified();

        return $this->success(null, 'Email verified');
    }

    protected function frontendRole(User $user): string
    {
        return match ($user->role) {
            UserRole::Seller => 'seller',
            UserRole::Admin => 'admin',
            default => 'buyer',
        };
    }

    protected function formatUser(User $user): array
    {
        $seller = $user->seller;
        $sellerPending = $user->role === UserRole::Customer
            && VendorRequest::where('user_id', $user->id)->where('status', 'pending')->exists();

        return [
            'id' => 'user_' . $user->id,
            'email' => $user->email,
            'firstName' => $user->first_name,
            'lastName' => $user->last_name,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'role' => $this->frontendRole($user),
            'avatar' => $user->avatar,
            'seller_id' => $seller ? 'sel_' . str_pad((string) $seller->id, 3, '0', STR_PAD_LEFT) : null,
            'sellerId' => $seller ? 'sel_' . str_pad((string) $seller->id, 3, '0', STR_PAD_LEFT) : null,
            'email_verified' => (bool) $user->email_verified_at,
            'seller_pending' => $sellerPending,
            'created_at' => $user->created_at?->toIso8601String(),
        ];
    }
}
