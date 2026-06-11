<?php

namespace App\Services;

use App\Models\Auction;
use App\Models\AuctionPayment;
use App\Models\AuctionWinner;
use App\Models\User;
use App\Services\Payment\SSLCommerzGateway;
use Illuminate\Support\Facades\DB;

class AuctionPaymentService
{
    public function __construct(protected SSLCommerzGateway $sslcommerz) {}

    public function verify(
        User $user,
        string $transactionReference,
        float $amount,
        ?string $auctionId = null,
        string $provider = 'manual',
        array $gatewayPayload = []
    ): AuctionPayment {
        if ($provider === 'manual' && !app()->environment('local', 'testing')) {
            throw new \RuntimeException('Manual payment verification is disabled in production');
        }

        $auction = null;
        if ($auctionId) {
            $auction = Auction::findOrFail((int) preg_replace('/\D/', '', $auctionId));
            $this->assertWinnerPayment($user, $auction, $amount);
        } elseif (!app()->environment('local', 'testing')) {
            throw new \RuntimeException('Auction payment must include auction_id');
        }

        if ($provider === 'sslcommerz') {
            $gatewayResult = $this->verifySslcommerz($gatewayPayload, $amount);
            if (!$gatewayResult['success']) {
                throw new \RuntimeException($gatewayResult['error'] ?? 'SSLCommerz verification failed');
            }
            $transactionReference = $gatewayPayload['tran_id']
                ?? $gatewayPayload['bank_tran_id']
                ?? $transactionReference;
        }

        $existing = AuctionPayment::where('user_id', $user->id)
            ->where('transaction_reference', $transactionReference)
            ->first();

        if ($existing?->status === 'verified') {
            return $existing;
        }

        return DB::transaction(function () use ($user, $auction, $transactionReference, $amount, $provider, $gatewayPayload, $existing) {
            $payment = $existing ?? new AuctionPayment([
                'user_id' => $user->id,
                'transaction_reference' => $transactionReference,
            ]);

            $payment->fill([
                'auction_id' => $auction?->id,
                'amount' => $amount,
                'currency' => $provider === 'sslcommerz' ? 'BDT' : 'USD',
                'provider' => $provider,
                'status' => 'verified',
                'meta' => $gatewayPayload ?: null,
                'verified_at' => now(),
            ]);
            $payment->save();

            if ($auction) {
                AuctionWinner::where('auction_id', $auction->id)
                    ->where('user_id', $user->id)
                    ->update([
                        'payment_status' => 'paid',
                        'paid_at' => now(),
                    ]);
            }

            return $payment->fresh();
        });
    }

    public function statusForUser(User $user, ?string $auctionId = null): array
    {
        $query = AuctionPayment::where('user_id', $user->id)->where('status', 'verified');

        if ($auctionId) {
            $aid = (int) preg_replace('/\D/', '', $auctionId);
            $query->where('auction_id', $aid);
            $winner = AuctionWinner::where('auction_id', $aid)->where('user_id', $user->id)->first();

            return [
                'verified' => $query->exists() || ($winner?->payment_status === 'paid'),
                'auction_id' => 'auc_' . str_pad((string) $aid, 3, '0', STR_PAD_LEFT),
                'payment_status' => $winner?->payment_status ?? ($query->exists() ? 'paid' : 'pending'),
                'winning_amount' => $winner ? (float) $winner->winning_amount : null,
            ];
        }

        return [
            'verified' => $query->exists(),
            'latest' => $query->latest('verified_at')->first()?->only([
                'transaction_reference', 'amount', 'provider', 'verified_at',
            ]),
        ];
    }

    protected function assertWinnerPayment(User $user, Auction $auction, float $amount): void
    {
        $winner = AuctionWinner::where('auction_id', $auction->id)
            ->where('user_id', $user->id)
            ->first();

        if (!$winner) {
            throw new \RuntimeException('You are not the winning bidder for this auction');
        }

        if ($winner->payment_status === 'paid') {
            throw new \RuntimeException('Payment for this auction is already verified');
        }

        $expected = (float) $winner->winning_amount;
        if (abs($amount - $expected) > 0.01) {
            throw new \RuntimeException("Amount must match the winning bid of {$expected}");
        }
    }

    protected function verifySslcommerz(array $payload, float $expectedAmount): array
    {
        $status = strtoupper((string) ($payload['status'] ?? ''));
        if (in_array($status, ['FAILED', 'CANCELLED'], true)) {
            return ['success' => false, 'error' => 'Payment was not completed'];
        }

        $valId = $payload['val_id'] ?? null;
        if ($valId) {
            return $this->sslcommerz->validateTransaction($valId, $expectedAmount);
        }

        if ($status === 'VALID' && config('fashionx.payments.mode') === 'sandbox') {
            return ['success' => true, 'status' => 'completed'];
        }

        return ['success' => false, 'error' => 'Missing SSLCommerz validation data'];
    }
}
