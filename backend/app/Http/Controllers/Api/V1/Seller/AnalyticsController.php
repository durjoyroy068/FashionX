<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Models\Product;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $seller = $request->user()->seller;

        if (!$seller) {
            return $this->success(['products' => 0, 'revenue' => 0, 'orders' => 0]);
        }

        return $this->success([
            'products' => Product::where('seller_id', $seller->id)->count(),
            'revenue' => (float) OrderItem::where('seller_id', $seller->id)->sum('total'),
            'orders' => OrderItem::where('seller_id', $seller->id)->distinct('order_id')->count('order_id'),
        ]);
    }
}
