<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Seller;
use App\Traits\ApiResponse;

class SellerController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $sellers = Seller::where('status', 'approved')
            ->orderByDesc('sales_count')
            ->get()
            ->map(fn ($s) => [
                'id' => 'sel_' . str_pad((string) $s->id, 3, '0', STR_PAD_LEFT),
                'name' => $s->business_name,
                'slug' => $s->slug,
                'logo' => $s->logo,
                'description' => $s->description,
                'location' => $s->location,
                'rating' => (float) $s->rating,
                'verified' => (bool) $s->verified,
                'salesCount' => (int) $s->sales_count,
            ]);

        return $this->success($sellers);
    }

    public function show(string $id)
    {
        $seller = Seller::where('id', (int) preg_replace('/\D/', '', $id))
            ->where('status', 'approved')
            ->firstOrFail();

        return $this->success([
            'id' => 'sel_' . str_pad((string) $seller->id, 3, '0', STR_PAD_LEFT),
            'name' => $seller->business_name,
            'slug' => $seller->slug,
            'logo' => $seller->logo,
            'description' => $seller->description,
            'location' => $seller->location,
            'rating' => (float) $seller->rating,
            'verified' => (bool) $seller->verified,
            'salesCount' => (int) $seller->sales_count,
        ]);
    }
}
