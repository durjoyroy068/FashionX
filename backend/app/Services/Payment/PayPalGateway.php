<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Str;

class PayPalGateway implements PaymentGatewayInterface
{
    public function provider(): string
    {
        return 'paypal';
    }

    public function charge(Order $order, Payment $payment, array $payload = []): array
    {
        return [
            'success' => true,
            'transaction_id' => 'paypal_' . Str::uuid(),
            'redirect_url' => config('fashionx.payments.paypal.return_url'),
            'meta' => ['mode' => config('fashionx.payments.mode', 'sandbox')],
        ];
    }

    public function verifyCallback(array $payload): array
    {
        return ['success' => ($payload['status'] ?? '') === 'COMPLETED', 'status' => 'completed'];
    }

    public function refund(Payment $payment, float $amount): array
    {
        return ['success' => true, 'transaction_id' => 'paypal_refund_' . Str::uuid()];
    }
}
