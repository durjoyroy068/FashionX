<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Str;

class SSLCommerzGateway implements PaymentGatewayInterface
{
    public function provider(): string
    {
        return 'sslcommerz';
    }

    public function charge(Order $order, Payment $payment, array $payload = []): array
    {
        return [
            'success' => true,
            'transaction_id' => 'ssl_' . Str::uuid(),
            'redirect_url' => config('fashionx.payments.sslcommerz.return_url'),
            'meta' => ['tran_id' => $payment->id, 'mode' => config('fashionx.payments.mode', 'sandbox')],
        ];
    }

    public function verifyCallback(array $payload): array
    {
        $valid = ($payload['status'] ?? '') === 'VALID' || ($payload['val_id'] ?? null);

        return ['success' => (bool) $valid, 'status' => $valid ? 'completed' : 'failed'];
    }

    public function refund(Payment $payment, float $amount): array
    {
        return ['success' => true, 'transaction_id' => 'ssl_refund_' . Str::uuid()];
    }
}
