<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Str;

class StripeGateway implements PaymentGatewayInterface
{
    public function provider(): string
    {
        return 'stripe';
    }

    public function charge(Order $order, Payment $payment, array $payload = []): array
    {
        $txnId = 'stripe_' . Str::uuid();

        if (config('fashionx.payments.stripe.secret') && class_exists(\Stripe\Stripe::class)) {
            // Production: integrate Stripe SDK here
        }

        return [
            'success' => true,
            'transaction_id' => $txnId,
            'meta' => ['mode' => config('fashionx.payments.mode', 'sandbox')],
        ];
    }

    public function verifyCallback(array $payload): array
    {
        return ['success' => ($payload['status'] ?? '') === 'succeeded', 'status' => 'completed'];
    }

    public function refund(Payment $payment, float $amount): array
    {
        return ['success' => true, 'transaction_id' => 'stripe_refund_' . Str::uuid()];
    }
}
