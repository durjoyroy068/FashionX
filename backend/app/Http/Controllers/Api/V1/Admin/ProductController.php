<?php

namespace App\Http\Controllers\Api\V1\Admin;

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
        $products = Product::with(['brand', 'category', 'seller'])
            ->latest()
            ->paginate(24);

        return response()->json([
            'success' => true,
            'data' => ProductResource::collection($products->getCollection())->resolve(),
            'meta' => ['total' => $products->total()],
        ]);
    }

    public function update(Request $request, string $id)
    {
        $product = Product::findOrFail((int) preg_replace('/\D/', '', $id));
        $product->update($request->validate([
            'featured' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
            'stock' => 'sometimes|integer|min:0',
        ]));

        return $this->success(new ProductResource($product->fresh()), 'Product updated');
    }

    public function destroy(string $id)
    {
        Product::findOrFail((int) preg_replace('/\D/', '', $id))->delete();

        return $this->success(null, 'Product deleted');
    }
}
