<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Traits\ApiResponse;

class BrandController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $brands = Brand::orderBy('name')->get()->map(fn ($b) => [
            'id' => 'br_' . str_pad((string) $b->id, 3, '0', STR_PAD_LEFT),
            'name' => $b->name,
            'logo' => $b->logo,
            'description' => $b->description,
            'country' => $b->country,
            'verified' => $b->verified,
            'productCount' => $b->product_count,
        ]);

        return $this->success($brands);
    }

    public function show(string $id)
    {
        $numericId = (int) preg_replace('/\D/', '', $id);
        $brand = Brand::findOrFail($numericId);

        return $this->success([
            'id' => 'br_' . str_pad((string) $brand->id, 3, '0', STR_PAD_LEFT),
            'name' => $brand->name,
            'logo' => $brand->logo,
            'description' => $brand->description,
            'country' => $brand->country,
            'verified' => $brand->verified,
            'productCount' => $brand->product_count,
        ]);
    }
}
