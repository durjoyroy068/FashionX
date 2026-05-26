<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\Wishlist;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class WishlistController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $products = Product::where('is_active', true)->whereIn(
            'id',
            Wishlist::where('user_id', $request->user()->id)->pluck('product_id')
        )->with(['images', 'brand', 'category', 'variants'])->get();

        return $this->success(ProductResource::collection($products)->resolve());
    }

    public function store(Request $request)
    {
        $data = $request->validate(['product_id' => 'required|string']);
        $pid = (int) preg_replace('/\D/', '', $data['product_id']);
        Product::findOrFail($pid);

        Wishlist::firstOrCreate([
            'user_id' => $request->user()->id,
            'product_id' => $pid,
        ]);

        return $this->success(null, 'Added to wishlist', 201);
    }

    public function destroy(Request $request, string $productId)
    {
        $pid = (int) preg_replace('/\D/', '', $productId);
        Wishlist::where('user_id', $request->user()->id)->where('product_id', $pid)->delete();

        return $this->success(null, 'Removed from wishlist');
    }
}
