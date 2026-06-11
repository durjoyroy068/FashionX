<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayoutController extends Controller
{
    use ApiResponse;

    public function summary(Request $request)
    {
        $seller = $request->user()->seller;
        if (!$seller) {
            return $this->error('Seller profile not found', 404);
        }

        $totalEarned = OrderItem::query()
            ->whereHas('order', fn ($q) => $q->where('status', 'delivered'))
            ->whereHas('product', fn ($q) => $q->where('seller_id', $seller->id))
            ->sum(DB::raw('unit_price * quantity'));

        return $this->success([
            'total_earned' => round((float) $totalEarned, 2),
            'pending_payout' => 0.00,
            'currency' => 'USD',
            'note' => 'Payout processing is managed manually. Contact support.',
        ]);
    }
}
