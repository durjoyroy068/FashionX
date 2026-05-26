<?php

namespace App\Services;

use App\Models\Auction;
use App\Models\AuctionBid;
use App\Models\AuctionWinner;
use Illuminate\Support\Facades\DB;

class AuctionService
{
    public function __construct(protected ActivityLogger $logger) {}

    public function placeBid(Auction $auction, int $userId, string $bidderName, float $amount): AuctionBid
    {
        if ($auction->status !== 'active') {
            throw new \RuntimeException('Auction is not active');
        }
        if ($auction->end_time->isPast()) {
            throw new \RuntimeException('Auction has ended');
        }

        $minBid = max((float) $auction->current_bid + (float) $auction->bid_increment, (float) $auction->starting_bid);

        if ($amount < $minBid) {
            throw new \RuntimeException("Minimum bid is {$minBid}");
        }

        return DB::transaction(function () use ($auction, $userId, $bidderName, $amount) {
            $locked = Auction::where('id', $auction->id)->lockForUpdate()->first();

            if ($amount <= (float) $locked->current_bid) {
                throw new \RuntimeException('Bid must exceed current highest bid');
            }

            $bid = AuctionBid::create([
                'auction_id' => $locked->id,
                'user_id' => $userId,
                'bidder_name' => $bidderName,
                'amount' => $amount,
            ]);

            $locked->update(['current_bid' => $amount]);
            $this->logger->log('auction.bid', $locked, ['amount' => $amount], $userId);

            return $bid;
        });
    }

    public function finalizeEndedAuctions(): int
    {
        $count = 0;
        $ended = Auction::where('status', 'active')->where('end_time', '<=', now())->get();

        foreach ($ended as $auction) {
            $this->finalizeAuction($auction);
            $count++;
        }

        return $count;
    }

    public function finalizeAuction(Auction $auction): ?AuctionWinner
    {
        return DB::transaction(function () use ($auction) {
            $topBid = AuctionBid::where('auction_id', $auction->id)->orderByDesc('amount')->first();

            $auction->update(['status' => 'ended']);

            if (!$topBid) {
                return null;
            }

            return AuctionWinner::updateOrCreate(
                ['auction_id' => $auction->id],
                [
                    'user_id' => $topBid->user_id,
                    'bid_id' => $topBid->id,
                    'winning_amount' => $topBid->amount,
                    'won_at' => now(),
                ]
            );
        });
    }
}
