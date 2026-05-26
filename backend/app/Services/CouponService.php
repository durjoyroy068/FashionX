<?php

namespace App\Services;

use App\Models\Coupon;

class CouponService
{
    public function validate(string $code, float $subtotal): array
    {
        $coupon = Coupon::where('code', strtoupper($code))->first();

        if (!$coupon || !$coupon->isValid()) {
            return ['valid' => false, 'message' => 'Invalid or expired coupon'];
        }

        if ($coupon->min_order && $subtotal < (float) $coupon->min_order) {
            return ['valid' => false, 'message' => 'Order does not meet minimum for this coupon'];
        }

        $discount = $coupon->type === 'percent'
            ? round($subtotal * ((float) $coupon->value / 100), 2)
            : min((float) $coupon->value, $subtotal);

        return [
            'valid' => true,
            'coupon' => $coupon,
            'discount' => $discount,
            'label' => $coupon->type === 'percent' ? "{$coupon->value}% off" : "\${$coupon->value} off",
        ];
    }

    public function apply(Coupon $coupon): void
    {
        $coupon->increment('used_count');
    }
}
