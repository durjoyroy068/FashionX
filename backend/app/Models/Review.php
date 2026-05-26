<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    protected $fillable = [
        'user_id', 'product_id', 'seller_id', 'rating', 'title', 'body',
        'is_approved', 'is_spam', 'rejection_reason', 'reported_at',
    ];

    protected function casts(): array
    {
        return [
            'is_approved' => 'boolean',
            'is_spam' => 'boolean',
            'reported_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
