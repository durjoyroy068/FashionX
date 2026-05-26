<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Review::with(['user:id,first_name,last_name', 'product:id,name'])->latest();

        if ($request->get('status') === 'pending') {
            $query->where('is_approved', false)->where('is_spam', false);
        }
        if ($request->get('status') === 'reported') {
            $query->whereNotNull('reported_at');
        }

        $reviews = $query->limit(100)->get()->map(fn ($r) => [
            'id' => $r->id,
            'rating' => $r->rating,
            'title' => $r->title,
            'body' => $r->body,
            'product_id' => $r->product_id,
            'product' => $r->product ? ['id' => $r->product->id, 'name' => $r->product->name] : null,
            'user' => $r->user ? ['first_name' => $r->user->first_name, 'last_name' => $r->user->last_name] : null,
            'reported_at' => $r->reported_at?->toIso8601String(),
        ]);

        return $this->success($reviews);
    }

    public function approve(string $id)
    {
        $review = Review::findOrFail((int) preg_replace('/\D/', '', $id));
        $wasApproved = $review->is_approved;
        $review->update(['is_approved' => true, 'rejection_reason' => null]);
        if (!$wasApproved) {
            $review->product?->increment('review_count');
        }

        return $this->success(null, 'Review approved');
    }

    public function reject(Request $request, string $id)
    {
        $review = Review::findOrFail((int) preg_replace('/\D/', '', $id));
        $review->update([
            'is_approved' => false,
            'rejection_reason' => $request->input('reason', 'Rejected by admin'),
        ]);

        return $this->success(null, 'Review rejected');
    }

    public function markSpam(string $id)
    {
        Review::findOrFail((int) preg_replace('/\D/', '', $id))->update(['is_spam' => true, 'is_approved' => false]);

        return $this->success(null, 'Marked as spam');
    }

    public function destroy(string $id)
    {
        Review::findOrFail((int) preg_replace('/\D/', '', $id))->delete();

        return $this->success(null, 'Review deleted');
    }
}
