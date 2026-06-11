<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Services\Payment\PaymentManager;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    use ApiResponse;

    public function __construct(protected PaymentManager $payments) {}

    public function show(Request $request, string $id)
    {
        $payment = Payment::with('order')
            ->where('user_id', $request->user()->id)
            ->where('id', (int) preg_replace('/\D/', '', $id))
            ->firstOrFail();

        return $this->success([
            'id' => $payment->id,
            'status' => $payment->status,
            'amount' => (float) $payment->amount,
            'provider' => $payment->provider,
            'transaction_id' => $payment->transaction_id,
            'order_id' => 'ord_' . $payment->order_id,
        ]);
    }

    public function webhook(Request $request, string $provider)
    {
        $allowed = ['stripe', 'paypal', 'sslcommerz', 'card'];
        if (!in_array(strtolower($provider), $allowed, true)) {
            return response()->json(['success' => false, 'message' => 'Invalid provider'], 422);
        }

        $context = [
            'raw_body' => $request->getContent(),
            'headers' => $request->headers->all(),
            'payload' => $request->all(),
            'ip' => $request->ip(),
        ];

        $result = $this->payments->handleWebhook($provider, $context);

        return response()->json(
            ['success' => $result['success'] ?? false],
            ($result['success'] ?? false) ? 200 : 403
        );
    }
}
