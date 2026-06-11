<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Http\Controllers\Controller;
use App\Models\OrderItem;
use App\Models\Product;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AnalyticsController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $seller = $request->user()->seller;

        if (!$seller) {
            return $this->success([
                'products' => 0,
                'revenue' => 0,
                'orders' => 0,
                'weekly_sales' => $this->emptyWeeklySales(),
            ]);
        }

        return $this->success([
            'products' => Product::where('seller_id', $seller->id)->count(),
            'revenue' => (float) OrderItem::where('seller_id', $seller->id)->sum('total'),
            'orders' => OrderItem::where('seller_id', $seller->id)->distinct('order_id')->count('order_id'),
            'weekly_sales' => $this->weeklySales($seller->id),
        ]);
    }

    protected function weeklySales(int $sellerId): array
    {
        $days = collect(range(6, 0))->map(fn (int $i) => now()->subDays($i)->startOfDay());

        return $days->map(function (Carbon $day) use ($sellerId) {
            $start = $day->copy();
            $end = $day->copy()->endOfDay();

            $revenue = (float) OrderItem::query()
                ->where('seller_id', $sellerId)
                ->whereHas('order', function ($q) use ($start, $end) {
                    $q->whereNotIn('status', ['cancelled'])
                        ->whereBetween('created_at', [$start, $end]);
                })
                ->sum('total');

            return [
                'label' => $start->format('D'),
                'date' => $start->toDateString(),
                'revenue' => $revenue,
            ];
        })->values()->all();
    }

    protected function emptyWeeklySales(): array
    {
        return collect(range(6, 0))
            ->map(fn (int $i) => [
                'label' => now()->subDays($i)->format('D'),
                'date' => now()->subDays($i)->toDateString(),
                'revenue' => 0.0,
            ])
            ->values()
            ->all();
    }
}
