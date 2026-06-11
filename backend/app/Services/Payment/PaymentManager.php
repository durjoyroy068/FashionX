<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Transaction;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

class PaymentManager
{
    protected array $gateways;

    public function __construct()
    {
        $this->gateways = [
            'stripe' => new StripeGateway(),
            'card' => new StripeGateway(),
            'paypal' => new PayPalGateway(),
            'sslcommerz' => new SSLCommerzGateway(),
        ];
    }

    public function gateway(string $provider): PaymentGatewayInterface
    {
        $key = strtolower($provider);
        if (!isset($this->gateways[$key])) {
            throw new InvalidArgumentException("Unsupported payment provider: {$provider}");
        }

        return $this->gateways[$key];
    }

    public function process(Order $order, string $method, array $payload = []): array
    {
        $provider = $this->resolveProvider($method);

        $payment = Payment::create([
            'order_id' => $order->id,
            'user_id' => $order->user_id,
            'method' => $method,
            'provider' => $provider,
            'amount' => $order->total,
            'currency' => 'USD',
            'status' => 'pending',
        ]);

        $result = $this->gateway($provider)->charge($order, $payment, $payload);

        if ($result['success']) {
            $payment->update([
                'status' => 'completed',
                'transaction_id' => $result['transaction_id'] ?? null,
                'meta' => $result['meta'] ?? null,
            ]);
            $order->update(['payment_status' => 'paid', 'status' => 'confirmed']);

            Transaction::create([
                'payment_id' => $payment->id,
                'type' => 'charge',
                'amount' => $order->total,
                'status' => 'completed',
                'reference' => $result['transaction_id'] ?? null,
            ]);
        } else {
            $payment->update(['status' => 'failed']);
            $order->update(['payment_status' => 'failed']);
        }

        return array_merge($result, ['payment_id' => $payment->id]);
    }

    public function handleWebhook(string $provider, array $context): array
    {
        $gateway = $this->gateway($provider);
        $verified = $gateway->verifyCallback($context);

        if (!($verified['success'] ?? false)) {
            Log::warning('Payment webhook rejected', [
                'provider' => $provider,
                'ip' => $context['ip'] ?? null,
                'error' => $verified['error'] ?? 'verification failed',
            ]);

            return $verified;
        }

        $payload = $context['payload'] ?? [];
        $transactionId = $verified['transaction_id']
            ?? $payload['transaction_id']
            ?? $payload['tran_id']
            ?? $payload['bank_tran_id']
            ?? null;

        if ($transactionId) {
            $payment = Payment::where('transaction_id', $transactionId)->first();
            if ($payment) {
                $payment->update(['status' => 'completed']);
                $payment->order?->update(['payment_status' => 'paid', 'status' => 'confirmed']);
            }
        }

        return $verified;
    }

    protected function resolveProvider(string $method): string
    {
        return match (strtolower($method)) {
            'card' => 'stripe',
            'paypal' => 'paypal',
            'sslcommerz' => 'sslcommerz',
            default => strtolower($method),
        };
    }
}
