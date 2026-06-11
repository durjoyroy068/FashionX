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
        $storeId = config('fashionx.payments.sslcommerz.store_id');
        $storePass = config('fashionx.payments.sslcommerz.store_pass');
        $sandbox = config('fashionx.payments.sslcommerz.sandbox', true);

        if (!$storeId || !$storePass) {
            if ($sandbox) {
                return [
                    'success' => true,
                    'transaction_id' => 'ssl_sandbox_' . Str::uuid(),
                    'meta' => ['mode' => 'sandbox'],
                ];
            }

            return ['success' => false, 'error' => 'SSLCommerz credentials not configured'];
        }

        $postData = [
            'store_id' => $storeId,
            'store_passwd' => $storePass,
            'total_amount' => number_format($order->total, 2, '.', ''),
            'currency' => 'BDT',
            'tran_id' => 'ssl_' . $payment->id . '_' . time(),
            'success_url' => config('fashionx.payments.sslcommerz.return_url'),
            'fail_url' => config('fashionx.payments.sslcommerz.return_url') . '?status=failed',
            'cancel_url' => config('fashionx.payments.sslcommerz.return_url') . '?status=cancelled',
            'cus_name' => $payload['customer_name'] ?? 'Customer',
            'cus_email' => $payload['customer_email'] ?? $order->user?->email ?? '',
            'cus_phone' => $payload['customer_phone'] ?? '01700000000',
            'cus_add1' => $payload['address'] ?? 'Dhaka',
            'cus_city' => $payload['city'] ?? 'Dhaka',
            'cus_country' => $payload['country'] ?? 'Bangladesh',
            'shipping_method' => 'NO',
            'product_name' => 'FashionX Order #' . $order->id,
            'product_category' => 'Fashion',
            'product_profile' => 'general',
        ];

        $baseUrl = $sandbox
            ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
            : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $baseUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, !$sandbox);
        $response = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            return ['success' => false, 'error' => 'SSLCommerz connection failed: ' . $err];
        }

        $result = json_decode($response, true);
        if (($result['status'] ?? '') === 'SUCCESS') {
            return [
                'success' => true,
                'transaction_id' => $result['sessionkey'] ?? ('ssl_' . $payment->id),
                'redirect_url' => $result['GatewayPageURL'] ?? null,
                'meta' => $result,
            ];
        }

        return ['success' => false, 'error' => $result['failedreason'] ?? 'SSLCommerz initiation failed'];
    }

    public function verifyCallback(array $payload): array
    {
        $data = $payload['payload'] ?? $payload;
        $valId = $data['val_id'] ?? null;

        if ($valId) {
            $amount = isset($data['amount']) ? (float) $data['amount'] : null;

            return $this->validateTransaction($valId, $amount);
        }

        if (config('fashionx.payments.mode') === 'sandbox' && app()->environment('testing')) {
            $valid = ($data['status'] ?? '') === 'VALID';

            return ['success' => $valid, 'status' => $valid ? 'completed' : 'failed'];
        }

        return ['success' => false, 'error' => 'SSLCommerz val_id required for webhook verification'];
    }

    /**
     * Validate a completed SSLCommerz transaction (production requires store credentials).
     */
    public function validateTransaction(string $valId, ?float $expectedAmount = null): array
    {
        $storeId = config('fashionx.payments.sslcommerz.store_id');
        $storePass = config('fashionx.payments.sslcommerz.store_pass');
        $sandbox = config('fashionx.payments.sslcommerz.sandbox', true);

        if (!$storeId || !$storePass) {
            if ($sandbox) {
                return [
                    'success' => true,
                    'status' => 'completed',
                    'meta' => ['mode' => 'sandbox', 'val_id' => $valId],
                ];
            }

            return ['success' => false, 'error' => 'SSLCommerz credentials not configured'];
        }

        $baseUrl = $sandbox
            ? 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
            : 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php';

        $query = http_build_query([
            'val_id' => $valId,
            'store_id' => $storeId,
            'store_passwd' => $storePass,
            'format' => 'json',
        ]);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $baseUrl . '?' . $query);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, !$sandbox);
        $response = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            return ['success' => false, 'error' => 'SSLCommerz validation failed: ' . $err];
        }

        $result = json_decode($response, true);
        $status = strtoupper((string) ($result['status'] ?? ''));

        if ($status !== 'VALID' && ($result['APIConnect'] ?? '') !== 'DONE') {
            return ['success' => false, 'error' => $result['error'] ?? 'Transaction not valid'];
        }

        if ($expectedAmount !== null && isset($result['amount'])) {
            if (abs((float) $result['amount'] - $expectedAmount) > 0.01) {
                return ['success' => false, 'error' => 'Paid amount does not match expected amount'];
            }
        }

        return [
            'success' => true,
            'status' => 'completed',
            'transaction_id' => $result['bank_tran_id'] ?? $result['tran_id'] ?? $valId,
            'meta' => $result,
        ];
    }

    public function refund(Payment $payment, float $amount): array
    {
        return ['success' => true, 'transaction_id' => 'ssl_refund_' . Str::uuid()];
    }
}
