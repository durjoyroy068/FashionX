<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class CartController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $cart = $this->getOrCreateCart($request);

        $items = $cart->items()->with(['product.images', 'product.brand', 'product.category'])->get();

        return $this->success($items->map(fn ($item) => [
            'product_id' => 'prod_' . str_pad((string) $item->product_id, 3, '0', STR_PAD_LEFT),
            'quantity' => $item->quantity,
            'price' => (float) $item->price,
            'product' => new ProductResource($item->product),
        ]));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required',
            'quantity' => 'integer|min:1',
        ]);

        $product = Product::findOrFail((int) preg_replace('/\D/', '', $data['product_id']));
        if (!$product->is_active) {
            return $this->error('Product is not available', 422);
        }
        $cart = $this->getOrCreateCart($request);
        $qty = (int) ($data['quantity'] ?? 1);
        if ($product->stock < $qty) {
            return $this->error('Insufficient stock', 422);
        }

        $item = CartItem::updateOrCreate(
            ['cart_id' => $cart->id, 'product_id' => $product->id, 'variant_id' => null],
            ['quantity' => $qty, 'price' => $product->effective_price]
        );

        return $this->success([
            'product_id' => 'prod_' . str_pad((string) $product->id, 3, '0', STR_PAD_LEFT),
            'quantity' => $item->quantity,
        ], 'Added to cart', 201);
    }

    public function update(Request $request, string $productId)
    {
        $data = $request->validate(['quantity' => 'required|integer|min:0']);
        $cart = $this->getOrCreateCart($request);
        $pid = (int) preg_replace('/\D/', '', $productId);

        if ($data['quantity'] === 0) {
            CartItem::where('cart_id', $cart->id)->where('product_id', $pid)->delete();

            return $this->success(null, 'Item removed');
        }

        $product = Product::find($pid);
        if (!$product || !$product->is_active) {
            return $this->error('Product is not available', 422);
        }
        if ($product->stock < $data['quantity']) {
            return $this->error('Insufficient stock', 422);
        }

        CartItem::where('cart_id', $cart->id)
            ->where('product_id', $pid)
            ->update(['quantity' => $data['quantity']]);

        return $this->success(null, 'Cart updated');
    }

    public function sync(Request $request)
    {
        $data = $request->validate([
            'items' => 'required|array',
            'items.*.product_id' => 'required',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        $cart = $this->getOrCreateCart($request);
        $cart->items()->delete();

        foreach ($data['items'] as $row) {
            $product = Product::find((int) preg_replace('/\D/', '', $row['product_id']));
            if (!$product || !$product->is_active || $product->stock < (int) $row['quantity']) {
                continue;
            }
            CartItem::create([
                'cart_id' => $cart->id,
                'product_id' => $product->id,
                'quantity' => $row['quantity'],
                'price' => $product->effective_price,
            ]);
        }

        return $this->index($request);
    }

    public function destroy(Request $request, string $productId)
    {
        $cart = $this->getOrCreateCart($request);
        $pid = (int) preg_replace('/\D/', '', $productId);
        CartItem::where('cart_id', $cart->id)->where('product_id', $pid)->delete();

        return $this->success(null, 'Item removed');
    }

    protected function getOrCreateCart(Request $request): Cart
    {
        return Cart::firstOrCreate(['user_id' => $request->user()->id]);
    }
}
