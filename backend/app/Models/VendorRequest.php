<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VendorRequest extends Model
{
    protected $fillable = [
        'user_id', 'business_name', 'business_email', 'business_phone',
        'business_address', 'description', 'tax_id', 'status', 'admin_notes',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
