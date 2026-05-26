<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuctionWinner extends Model
{
    protected $fillable = ['auction_id', 'user_id', 'bid_id', 'winning_amount', 'won_at'];

    protected function casts(): array
    {
        return [
            'winning_amount' => 'decimal:2',
            'won_at' => 'datetime',
        ];
    }

    public function auction(): BelongsTo
    {
        return $this->belongsTo(Auction::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
