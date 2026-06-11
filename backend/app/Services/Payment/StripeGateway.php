<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class StripeGateway implements PaymentGatewayInterface
{
    public function provider(): string
    {
        return 'stripe';
    }

    public function charge(Order $order, Payment $payment, array $payload = []): array
    {
        $secretKey = config('fashionx.payments.stripe.secret');

        if (!$secretKey) {
            if (config('fashionx.payments.mode') === 'sandbox') {
                return [
                    'success' => true,
                    'transaction_id' => 'stripe_sandbox_' . Str::uuid(),
                    'meta' => ['mode' => 'sandbox'],
                ];
            }

            return ['success' => false, 'error' => 'Stripe secret key not configured'];
        }

        try {
            \Stripe\Stripe::setApiKey($secretKey);
            $paymentIntent = \Stripe\PaymentIntent::create([
                'amount' => (int) round($order->total * 100),
                'currency' => strtolower($payment->currency ?? 'usd'),
                'metadata' => ['order_id' => $order->id, 'payment_id' => $payment->id],
                'payment_method' => $payload['payment_method_id'] ?? null,
                'confirm' => isset($payload['payment_method_id']),
            ]);

            return [
                'success' => in_array($paymentIntent->status, ['succeeded', 'requires_capture']),
                'transaction_id' => $paymentIntent->id,
                'meta' => [
                    'client_secret' => $paymentIntent->client_secret,
                    'status' => $paymentIntent->status,
                ],
            ];
        } catch (\Stripe\Exception\CardException $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        } catch (\Exception $e) {
            Log::error('Stripe charge failed', ['error' => $e->getMessage()]);

            return ['success' => false, 'error' => 'Payment processing failed'];
        }
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
