<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Seller;
use App\Models\VendorRequest;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SellerController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $sellers = Seller::with('user:id,email,first_name,last_name')
            ->latest()
            ->get();

        $pending = VendorRequest::with('user:id,email,first_name,last_name')
            ->where('status', 'pending')
            ->latest()
            ->get();

        return $this->success([
            'sellers' => $sellers,
            'pending' => $pending,
        ]);
    }

    public function approve(string $id)
    {
        $numericId = (int) preg_replace('/\D/', '', $id);
        $seller = Seller::find($numericId);
        $user = $seller?->user ?? \App\Models\User::findOrFail($numericId);

        $vendorRequest = VendorRequest::where('user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        Seller::updateOrCreate(
            ['user_id' => $user->id],
            [
                'business_name' => $vendorRequest?->business_name ?? $seller?->business_name ?? $user->name . ' Store',
                'slug' => $seller?->slug ?? Str::slug($user->name) . '-' . $user->id,
                'status' => 'approved',
                'verified' => true,
            ]
        );

        $vendorRequest?->update(['status' => 'approved']);
        $user->forceFill(['role' => \App\Enums\UserRole::Seller])->save();
        $user->syncRoles(['seller']);

        return $this->success(null, 'Seller approved');
    }

    public function reject(Request $request, string $id)
    {
        $numericId = (int) preg_replace('/\D/', '', $id);
        $user = \App\Models\User::findOrFail($numericId);

        VendorRequest::where('user_id', $user->id)
            ->where('status', 'pending')
            ->update([
                'status' => 'rejected',
                'admin_notes' => $request->input('reason', 'Rejected by admin'),
            ]);

        return $this->success(null, 'Seller application rejected');
    }
}
