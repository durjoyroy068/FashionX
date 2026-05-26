<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Seller extends Model
{
    protected $fillable = [
        'user_id', 'business_name', 'slug', 'description', 'logo',
        'status', 'commission_rate', 'verified', 'location', 'rating', 'sales_count',
    ];

    protected function casts(): array
    {
        return [
            'verified' => 'boolean',
            'rating' => 'decimal:2',
            'commission_rate' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}
