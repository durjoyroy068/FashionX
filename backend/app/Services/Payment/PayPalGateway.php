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
        $data = $payload['payload'] ?? $payload;
        $headers = $payload['headers'] ?? [];

        if (config('fashionx.payments.mode') === 'production') {
            $hasTransmission = isset($headers['paypal-transmission-id'])
                || isset($headers['PAYPAL-TRANSMISSION-ID']);
            if (!$hasTransmission) {
                return ['success' => false, 'error' => 'PayPal webhook headers missing'];
            }
        } elseif (!app()->environment('testing')) {
            return ['success' => false, 'error' => 'Unsigned PayPal webhook rejected'];
        }

        $eventType = $data['event_type'] ?? '';
        $success = $eventType === 'PAYMENT.CAPTURE.COMPLETED'
            || ($data['status'] ?? '') === 'COMPLETED';

        $transactionId = $data['resource']['id']
            ?? $data['transaction_id']
            ?? null;

        return [
            'success' => $success,
            'status' => $success ? 'completed' : 'ignored',
            'transaction_id' => $transactionId,
        ];
    }

    public function refund(Payment $payment, float $amount): array
    {
        return ['success' => true, 'transaction_id' => 'paypal_refund_' . Str::uuid()];
    }
}
