<?php

namespace App\Services;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Services\Payment\PaymentManager;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckoutService
{
    public function __construct(
        protected CouponService $coupons,
        protected PaymentManager $payments,
        protected ActivityLogger $logger,
    ) {}

    public function checkoutFromCart(int $userId, array $shipping, string $paymentMethod, ?string $couponCode = null, array $paymentPayload = []): Order
    {
        $cart = Cart::with(['items.product'])->where('user_id', $userId)->firstOrFail();

        if ($cart->items->isEmpty()) {
            throw new \RuntimeException('Cart is empty');
        }

        $items = $cart->items->map(fn (CartItem $item) => [
            'product' => $item->product,
            'quantity' => $item->quantity,
            'unit_price' => (float) $item->price,
        ])->all();

        return $this->placeOrder($userId, $items, $shipping, $paymentMethod, $couponCode, $paymentPayload, $cart);
    }

    public function checkoutFromPayload(int $userId, array $payload): Order
    {
        $items = [];
        foreach ($payload['items'] as $row) {
            $product = Product::findOrFail((int) preg_replace('/\D/', '', $row['product_id']));
            $qty = (int) $row['quantity'];
            if ($product->stock < $qty) {
                throw new \RuntimeException("Insufficient stock for {$product->name}");
            }
            $items[] = [
                'product' => $product,
                'quantity' => $qty,
                'unit_price' => $product->effective_price,
            ];
        }

        return $this->placeOrder(
            $userId,
            $items,
            $payload['shipping'] ?? $payload['shipping_address'],
            $payload['payment_method'],
            $payload['coupon_code'] ?? null,
            $payload['payment'] ?? [],
            null
        );
    }

    protected function placeOrder(
        int $userId,
        array $items,
        array $shipping,
        string $paymentMethod,
        ?string $couponCode,
        array $paymentPayload,
        ?Cart $cart
    ): Order {
        return DB::transaction(function () use ($userId, $items, $shipping, $paymentMethod, $couponCode, $paymentPayload, $cart) {
            $subtotal = 0;
            $lineItems = [];

            foreach ($items as $row) {
                $product = $row['product'];
                $qty = $row['quantity'];
                if ($product->stock < $qty) {
                    throw new \RuntimeException("Insufficient stock for {$product->name}");
                }
                $unit = $row['unit_price'];
                $lineTotal = $unit * $qty;
                $subtotal += $lineTotal;
                $lineItems[] = compact('product', 'qty', 'unit', 'lineTotal');
            }

            $discount = 0;
            $couponId = null;
            if ($couponCode) {
                $check = $this->coupons->validate($couponCode, $subtotal);
                if (!$check['valid']) {
                    throw new \RuntimeException($check['message']);
                }
                $discount = $check['discount'];
                $couponId = $check['coupon']->id;
            }

            $shippingCost = config('fashionx.shipping.flat_rate', 25);
            if ($subtotal - $discount >= config('fashionx.shipping.free_threshold', 500)) {
                $shippingCost = 0;
            }
            $tax = round(($subtotal - $discount) * config('fashionx.shipping.tax_rate', 0.08), 2);
            $total = max(0, $subtotal - $discount + $shippingCost + $tax);

            $order = Order::create([
                'user_id' => $userId,
                'order_number' => 'FX-' . strtoupper(Str::random(10)),
                'status' => 'pending',
                'subtotal' => $subtotal,
                'discount' => $discount,
                'shipping' => $shippingCost,
                'tax' => $tax,
                'total' => $total,
                'coupon_id' => $couponId,
                'shipping_address' => $shipping,
                'payment_status' => 'pending',
            ]);

            foreach ($lineItems as $li) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $li['product']->id,
                    'seller_id' => $li['product']->seller_id,
                    'name' => $li['product']->name,
                    'sku' => $li['product']->sku,
                    'quantity' => $li['qty'],
                    'unit_price' => $li['unit'],
                    'total' => $li['lineTotal'],
                ]);
            }

            $paymentResult = $this->payments->process($order, $paymentMethod, $paymentPayload);

            if (!($paymentResult['success'] ?? false)) {
                throw new \RuntimeException($paymentResult['message'] ?? 'Payment failed');
            }

            foreach ($lineItems as $li) {
                $li['product']->decrement('stock', $li['qty']);
            }

            if ($couponCode && isset($check['coupon'])) {
                $this->coupons->apply($check['coupon']);
            }

            if ($cart) {
                $cart->items()->delete();
            }

            $this->logger->log('order.placed', $order, ['total' => $total], $userId);

            Notification::create([
                'user_id' => $userId,
                'type' => 'order',
                'title' => 'Order Confirmed',
                'message' => "Order {$order->order_number} has been placed successfully.",
                'data' => ['order_id' => $order->id],
            ]);

            return $order->fresh(['items', 'payment']);
        });
    }
}
