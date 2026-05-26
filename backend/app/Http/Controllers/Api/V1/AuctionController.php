<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Auction;
use App\Models\AuctionBid;
use App\Services\AuctionService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class AuctionController extends Controller
{
    use ApiResponse;

    public function __construct(protected AuctionService $auctions) {}

    public function index()
    {
        $auctions = Auction::with(['seller', 'brand'])
            ->where('status', 'active')
            ->where('end_time', '>', now())
            ->orderBy('end_time')
            ->get()
            ->map(fn ($a) => $this->format($a));

        return $this->success($auctions);
    }

    public function show(string $id)
    {
        $auction = Auction::with(['seller', 'brand'])
            ->where('id', (int) preg_replace('/\D/', '', $id))
            ->firstOrFail();

        $bids = AuctionBid::where('auction_id', $auction->id)
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn ($b) => [
                'amount' => (float) $b->amount,
                'bidder' => $b->bidder_name,
                'date' => $b->created_at?->toIso8601String(),
            ]);

        return $this->success([
            ...$this->format($auction),
            'bids' => $bids,
        ]);
    }

    public function placeBid(Request $request, string $id)
    {
        $data = $request->validate(['amount' => 'required|numeric|min:1']);
        $auction = Auction::findOrFail((int) preg_replace('/\D/', '', $id));
        $user = $request->user();

        if ($user->seller && (int) $auction->seller_id === (int) $user->seller->id) {
            return $this->error('You cannot bid on your own auction', 422);
        }

        try {
            $bid = $this->auctions->placeBid(
                $auction,
                $user->id,
                trim($user->first_name . ' ' . $user->last_name) ?: 'Bidder',
                (float) $data['amount']
            );
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success([
            'bid' => ['amount' => (float) $bid->amount, 'id' => $bid->id],
            'currentBid' => (float) $auction->fresh()->current_bid,
        ], 'Bid placed', 201);
    }

    public function bids(string $id)
    {
        $aid = (int) preg_replace('/\D/', '', $id);
        $bids = AuctionBid::where('auction_id', $aid)
            ->orderByDesc('amount')
            ->limit(50)
            ->get()
            ->map(fn ($b) => [
                'amount' => (float) $b->amount,
                'bidder' => $b->bidder_name,
                'date' => $b->created_at?->toIso8601String(),
            ]);

        return $this->success($bids);
    }

    public function myBids(Request $request)
    {
        $rows = AuctionBid::query()
            ->select(['auction_bids.id', 'auction_bids.amount', 'auction_bids.created_at', 'auctions.id as auction_id', 'auctions.title'])
            ->join('auctions', 'auctions.id', '=', 'auction_bids.auction_id')
            ->where('auction_bids.user_id', $request->user()->id)
            ->orderByDesc('auction_bids.created_at')
            ->limit(200)
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'auctionId' => 'auc_' . str_pad((string) $b->auction_id, 3, '0', STR_PAD_LEFT),
                'auctionTitle' => $b->title,
                'amount' => (float) $b->amount,
                'date' => $b->created_at?->toIso8601String(),
            ]);

        return $this->success($rows);
    }

    protected function format(Auction $a): array
    {
        return [
            'id' => 'auc_' . str_pad((string) $a->id, 3, '0', STR_PAD_LEFT),
            'title' => $a->title,
            'description' => $a->description,
            'startingBid' => (float) $a->starting_bid,
            'currentBid' => (float) $a->current_bid,
            'bidIncrement' => (float) $a->bid_increment,
            'endTime' => $a->end_time?->toIso8601String(),
            'image' => $a->image,
            'sellerId' => 'sel_' . str_pad((string) $a->seller_id, 3, '0', STR_PAD_LEFT),
            'status' => $a->status,
        ];
    }
}
