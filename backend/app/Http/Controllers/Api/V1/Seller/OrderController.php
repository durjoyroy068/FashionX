<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $seller = $request->user()->seller;
        if (!$seller) {
            return $this->success([]);
        }
        $items = OrderItem::with('order')
            ->where('seller_id', $seller->id)
            ->latest()
            ->limit(50)
            ->get();

        return $this->success($items);
    }
}
