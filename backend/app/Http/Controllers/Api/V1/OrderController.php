<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\CheckoutService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    use ApiResponse;

    public function __construct(protected CheckoutService $checkout) {}

    public function index(Request $request)
    {
        $orders = Order::with('items')
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(fn ($o) => $this->formatOrder($o));

        return $this->success($orders);
    }

    public function show(Request $request, string $id)
    {
        $order = Order::with('items', 'payment')
            ->where('user_id', $request->user()->id)
            ->where('id', (int) preg_replace('/\D/', '', $id))
            ->firstOrFail();

        return $this->success($this->formatOrder($order));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required',
            'items.*.quantity' => 'required|integer|min:1',
            'shipping' => 'required|array',
            'payment_method' => 'required|in:card,stripe,paypal,sslcommerz',
            'coupon_code' => 'nullable|string',
            'card_last4' => 'nullable|string|size:4',
        ]);

        try {
            $order = $this->checkout->checkoutFromPayload($request->user()->id, [
                ...$data,
                'payment' => ['card_last4' => $data['card_last4'] ?? null],
            ]);
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage(), 422);
        }

        return $this->success($this->formatOrderPublic($order), 'Order placed', 201);
    }

    public function tracking(Request $request, string $id)
    {
        $order = Order::with(['items.product'])
            ->where('user_id', $request->user()->id)
            ->where('id', (int) preg_replace('/\D/', '', $id))
            ->firstOrFail();

        $steps = [
            ['status' => 'confirmed', 'label' => 'Order Confirmed', 'done' => true],
            ['status' => 'processing', 'label' => 'Processing', 'done' => in_array($order->status, ['processing', 'shipped', 'delivered'])],
            ['status' => 'shipped', 'label' => 'Shipped', 'done' => in_array($order->status, ['shipped', 'delivered'])],
            ['status' => 'delivered', 'label' => 'Delivered', 'done' => $order->status === 'delivered'],
        ];

        return $this->success([
            'id' => 'ord_' . $order->id,
            'status' => $order->status,
            'tracking_steps' => $steps,
            'estimated_delivery' => $order->created_at->addDays(7)->toDateString(),
            'items_count' => $order->items->count(),
        ]);
    }

    public function invoice(Request $request, string $id)
    {
        $order = Order::with('items', 'payment')
            ->where('user_id', $request->user()->id)
            ->where('id', (int) preg_replace('/\D/', '', $id))
            ->firstOrFail();

        return $this->success([
            ...$this->formatOrderPublic($order),
            'shipping_address' => $order->shipping_address,
            'payment' => $order->payment ? [
                'method' => $order->payment->method,
                'status' => $order->payment->status,
                'transaction_id' => $order->payment->transaction_id,
            ] : null,
            'invoice_number' => 'INV-' . $order->order_number,
        ]);
    }

    public function formatOrderPublic(Order $order): array
    {
        return $this->formatOrder($order);
    }

    protected function formatOrder(Order $order): array
    {
        return [
            'id' => 'ord_' . $order->id,
            'order_number' => $order->order_number,
            'status' => $order->status,
            'total' => (float) $order->total,
            'subtotal' => (float) $order->subtotal,
            'date' => $order->created_at?->toIso8601String(),
            'items' => $order->items?->map(fn ($i) => [
                'name' => $i->name,
                'quantity' => $i->quantity,
                'unit_price' => (float) $i->unit_price,
            ]),
        ];
    }
}
