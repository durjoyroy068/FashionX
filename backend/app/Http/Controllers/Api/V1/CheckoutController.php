<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Services\CheckoutService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    use ApiResponse;

    public function __construct(protected CheckoutService $checkout) {}

    public function fromCart(Request $request)
    {
        $data = $request->validate([
            'shipping' => 'required|array',
            'shipping.line1' => 'required|string',
            'shipping.city' => 'required|string',
            'shipping.postal_code' => 'required|string',
            'shipping.country_code' => 'required|string|size:2',
            'payment_method' => 'required|in:card,stripe,paypal,sslcommerz',
            'coupon_code' => 'nullable|string',
            'card_last4' => 'nullable|string|size:4',
        ]);

        try {
            $order = $this->checkout->checkoutFromCart(
                $request->user()->id,
                $data['shipping'],
                $data['payment_method'],
                $data['coupon_code'] ?? null,
                ['card_last4' => $data['card_last4'] ?? null]
            );
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success(app(OrderController::class)->formatOrderPublic($order), 'Order placed', 201);
    }

    public function validateCoupon(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string',
            'subtotal' => 'nullable|numeric|min:0',
        ]);

        $subtotal = isset($data['subtotal']) ? (float) $data['subtotal'] : $this->cartSubtotal($request->user()->id);

        $result = app(\App\Services\CouponService::class)->validate($data['code'], $subtotal);

        if (!$result['valid']) {
            return $this->error($result['message'], 422);
        }

        return $this->success([
            'code' => $result['coupon']->code,
            'discount' => $result['discount'],
            'label' => $result['label'],
        ]);
    }

    protected function cartSubtotal(int $userId): float
    {
        $cart = Cart::with('items')->where('user_id', $userId)->first();
        if (!$cart) {
            return 0;
        }

        return (float) $cart->items->sum(fn ($item) => (float) $item->price * (int) $item->quantity);
    }
}
