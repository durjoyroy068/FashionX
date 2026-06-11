<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AuctionPaymentService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class AuctionPaymentController extends Controller
{
    use ApiResponse;

    public function __construct(protected AuctionPaymentService $payments) {}

    public function verify(Request $request)
    {
        $data = $request->validate([
            'transaction_reference' => 'required_without:sslcommerz|string|max:128',
            'amount' => 'required|numeric|min:0.01',
            'auction_id' => 'nullable|string',
            'provider' => 'nullable|in:manual,sslcommerz',
            'sslcommerz' => 'nullable|array',
        ]);

        $provider = $data['provider'] ?? ($data['sslcommerz'] ? 'sslcommerz' : 'manual');
        $reference = $data['transaction_reference']
            ?? $data['sslcommerz']['tran_id']
            ?? $data['sslcommerz']['bank_tran_id']
            ?? null;

        if (!$reference) {
            return $this->error('Transaction reference is required', 422);
        }

        try {
            $payment = $this->payments->verify(
                $request->user(),
                $reference,
                (float) $data['amount'],
                $data['auction_id'] ?? null,
                $provider,
                $data['sslcommerz'] ?? []
            );
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success([
            'id' => $payment->id,
            'transaction_reference' => $payment->transaction_reference,
            'amount' => (float) $payment->amount,
            'status' => $payment->status,
            'auction_id' => $payment->auction_id
                ? 'auc_' . str_pad((string) $payment->auction_id, 3, '0', STR_PAD_LEFT)
                : null,
            'verified_at' => $payment->verified_at?->toIso8601String(),
        ], 'Payment verified', 201);
    }

    public function status(Request $request)
    {
        $auctionId = $request->query('auction_id');

        return $this->success(
            $this->payments->statusForUser($request->user(), is_string($auctionId) ? $auctionId : null)
        );
    }
}
