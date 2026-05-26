<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Product::query()
            ->with(['brand', 'category', 'seller', 'images', 'variants'])
            ->where('is_active', true);

        if ($q = $request->get('q')) {
            $query->where(function ($qb) use ($q) {
                $qb->where('name', 'like', "%{$q}%")
                    ->orWhere('description', 'like', "%{$q}%")
                    ->orWhereHas('brand', fn ($b) => $b->where('name', 'like', "%{$q}%"));
            });
        }

        if ($category = $request->get('category')) {
            $query->whereHas('category', fn ($c) => $c->where('slug', $category));
        }

        if ($brand = $request->get('brand')) {
            $query->whereHas('brand', fn ($b) => $b->where('slug', $brand)->orWhere('id', $brand));
        }

        if ($request->boolean('in_stock')) {
            $query->where('stock', '>', 0);
        }

        if ($badge = $request->get('badge')) {
            $query->whereJsonContains('badges', $badge);
        }

        $sort = $request->get('sort', 'featured');
        match ($sort) {
            'price-asc' => $query->orderByRaw('COALESCE(discount_price, price) ASC'),
            'price-desc' => $query->orderByRaw('COALESCE(discount_price, price) DESC'),
            'rating' => $query->orderByDesc('rating'),
            'newest' => $query->orderByDesc('created_at'),
            'name' => $query->orderBy('name'),
            default => $query->orderByDesc('featured')->orderByDesc('created_at'),
        };

        $perPage = min((int) $request->get('per_page', 24), 100);
        $products = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data' => ProductResource::collection($products->getCollection())->resolve(),
            'meta' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
        ]);
    }

    public function show(string $id)
    {
        $numericId = (int) preg_replace('/\D/', '', $id);
        $product = Product::with(['brand', 'category', 'images', 'variants', 'seller'])
            ->where('id', $numericId)
            ->where('is_active', true)
            ->firstOrFail();

        return $this->success(new ProductResource($product));
    }
}
