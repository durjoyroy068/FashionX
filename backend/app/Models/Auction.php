<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Auction extends Model
{
    protected $fillable = [
        'seller_id', 'brand_id', 'category_id', 'title', 'slug', 'description',
        'starting_bid', 'current_bid', 'reserve_price', 'bid_increment',
        'end_time', 'status', 'image', 'bidder_count',
    ];

    protected function casts(): array
    {
        return [
            'starting_bid' => 'decimal:2',
            'current_bid' => 'decimal:2',
            'reserve_price' => 'decimal:2',
            'bid_increment' => 'decimal:2',
            'end_time' => 'datetime',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(Seller::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function bids(): HasMany
    {
        return $this->hasMany(AuctionBid::class);
    }
}
