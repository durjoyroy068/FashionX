<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $images = $this->relationLoaded('images')
            ? $this->images->pluck('path')->all()
            : [];

        return [
            'id' => 'prod_' . str_pad((string) $this->id, 3, '0', STR_PAD_LEFT),
            'name' => $this->name,
            'brand' => $this->brand?->name,
            'brandId' => $this->brand ? 'br_' . str_pad((string) $this->brand_id, 3, '0', STR_PAD_LEFT) : null,
            'sellerId' => $this->seller ? 'sel_' . str_pad((string) $this->seller_id, 3, '0', STR_PAD_LEFT) : null,
            'price' => (float) $this->price,
            'discountPrice' => $this->discount_price ? (float) $this->discount_price : null,
            'category' => $this->category?->slug,
            'rating' => (float) $this->rating,
            'reviewCount' => (int) $this->review_count,
            'stock' => (int) $this->stock,
            'stock_quantity' => (int) $this->stock,
            'in_stock' => $this->stock > 0,
            'featured' => (bool) $this->featured,
            'is_active' => (bool) $this->is_active,
            'badges' => $this->badges ?? [],
            'description' => $this->description,
            'materials' => $this->materials,
            'packaging' => $this->packaging,
            'images' => $images,
            'variants' => $this->relationLoaded('variants')
                ? $this->variants->pluck('name')->all()
                : [],
            'deliveryDays' => $this->delivery_days,
            'createdAt' => $this->created_at?->toIso8601String(),
        ];
    }
}
