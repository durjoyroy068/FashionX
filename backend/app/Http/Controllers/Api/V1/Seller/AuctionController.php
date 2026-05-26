<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Http\Controllers\Controller;
use App\Models\Auction;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuctionController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $seller = $request->user()->seller;
        if (!$seller) {
            return $this->success([]);
        }

        return $this->success(
            Auction::where('seller_id', $seller->id)->latest()->get()
        );
    }

    public function store(Request $request)
    {
        $seller = $request->user()->seller;
        if (!$seller) {
            return $this->error('Seller profile required', 403);
        }

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'starting_bid' => 'required|numeric|min:1',
            'bid_increment' => 'nullable|numeric|min:1',
            'end_time' => 'required|date|after:now',
            'image' => 'nullable|url',
            'brand_id' => 'nullable|exists:brands,id',
            'category_id' => 'nullable|exists:categories,id',
        ]);

        $auction = Auction::create([
            ...$data,
            'seller_id' => $seller->id,
            'slug' => Str::slug($data['title']) . '-' . uniqid(),
            'current_bid' => $data['starting_bid'],
            'bid_increment' => $data['bid_increment'] ?? 50,
            'status' => 'active',
        ]);

        return $this->success($auction, 'Auction created', 201);
    }

    public function show(Request $request, Auction $auction)
    {
        $this->authorizeOwn($request, $auction);

        return $this->success($auction);
    }

    public function update(Request $request, Auction $auction)
    {
        $this->authorizeOwn($request, $auction);
        $auction->update($request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'end_time' => 'sometimes|date|after:now',
            'status' => 'sometimes|in:draft,active,ended,cancelled',
            'image' => 'nullable|url',
        ]));

        return $this->success($auction->fresh(), 'Auction updated');
    }

    public function destroy(Request $request, Auction $auction)
    {
        $this->authorizeOwn($request, $auction);
        $auction->delete();

        return $this->success(null, 'Auction deleted');
    }

    protected function authorizeOwn(Request $request, Auction $auction): void
    {
        $seller = $request->user()->seller;
        if (!$seller || $auction->seller_id !== $seller->id) {
            abort(404);
        }
    }
}
