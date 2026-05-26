<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $orders = Order::with(['user:id,email,first_name,last_name', 'items'])
            ->latest()
            ->paginate(20);

        $data = $orders->getCollection()->map(fn ($o) => [
            'id' => 'ord_' . $o->id,
            'order_number' => $o->order_number,
            'status' => $o->status,
            'payment_status' => $o->payment_status,
            'total' => (float) $o->total,
            'subtotal' => (float) $o->subtotal,
            'date' => $o->created_at?->toIso8601String(),
            'user_email' => $o->user?->email,
            'items' => $o->items?->map(fn ($i) => [
                'name' => $i->name,
                'quantity' => $i->quantity,
            ]),
        ]);

        return response()->json([
            'success' => true,
            'data' => $data,
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function updateStatus(Request $request, string $id)
    {
        $data = $request->validate([
            'status' => 'required|in:pending,confirmed,processing,shipped,delivered,cancelled,refunded',
        ]);

        $order = Order::findOrFail((int) preg_replace('/\D/', '', $id));
        $order->update(['status' => $data['status']]);

        if ($order->user_id) {
            \App\Models\Notification::create([
                'user_id' => $order->user_id,
                'type' => 'order',
                'title' => 'Order Update',
                'message' => "Your order {$order->order_number} is now {$data['status']}.",
                'data' => ['order_id' => $order->id],
            ]);
        }

        return $this->success(null, 'Order status updated');
    }
}
