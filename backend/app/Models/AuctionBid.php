<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuctionBid extends Model
{
    protected $fillable = ['auction_id', 'user_id', 'bidder_name', 'amount'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    public function auction(): BelongsTo
    {
        return $this->belongsTo(Auction::class);
    }
}
