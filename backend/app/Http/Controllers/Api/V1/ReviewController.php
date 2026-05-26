<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Review;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    use ApiResponse;

    public function index(string $productId)
    {
        $pid = (int) preg_replace('/\D/', '', $productId);
        $reviews = Review::with('user:id,first_name,last_name')
            ->where('product_id', $pid)
            ->where('is_approved', true)
            ->where('is_spam', false)
            ->latest()
            ->get()
            ->map(fn ($r) => [
                'id' => 'rev_' . $r->id,
                'rating' => $r->rating,
                'title' => $r->title,
                'body' => $r->body,
                'author' => trim(($r->user->first_name ?? '') . ' ' . ($r->user->last_name ?? '')),
                'date' => $r->created_at?->toIso8601String(),
            ]);

        return $this->success($reviews);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'product_id' => 'required',
            'rating' => 'required|integer|min:1|max:5',
            'title' => 'nullable|string|max:255',
            'body' => 'nullable|string|max:2000',
        ]);

        $pid = (int) preg_replace('/\D/', '', $data['product_id']);
        $product = Product::findOrFail($pid);

        $review = Review::updateOrCreate(
            ['user_id' => $request->user()->id, 'product_id' => $pid],
            [
                'seller_id' => $product->seller_id,
                'rating' => $data['rating'],
                'title' => $data['title'] ?? null,
                'body' => $data['body'] ?? null,
                'is_approved' => false,
            ]
        );

        return $this->success(['id' => 'rev_' . $review->id], 'Review submitted for moderation', 201);
    }

    public function report(Request $request, string $id)
    {
        $review = Review::findOrFail((int) preg_replace('/\D/', '', $id));
        $review->update(['reported_at' => now()]);

        return $this->success(null, 'Review reported');
    }
}
