<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Models\NewsletterSubscriber;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\Seller;
use App\Models\User;
use App\Models\VendorRequest;
use App\Traits\ApiResponse;

class DashboardController extends Controller
{
    use ApiResponse;

    public function index()
    {
        return $this->success([
            'users' => User::count(),
            'products' => Product::count(),
            'orders' => Order::count(),
            'revenue' => (float) Order::where('payment_status', 'paid')->sum('total'),
            'pending_sellers' => VendorRequest::where('status', 'pending')->count(),
            'pending_reviews' => Review::where('is_approved', false)->where('is_spam', false)->count(),
            'active_sellers' => Seller::where('status', 'approved')->count(),
            'new_contact_messages' => ContactMessage::where('status', 'new')->count(),
            'newsletter_subscribers' => NewsletterSubscriber::where('is_active', true)->count(),
        ]);
    }
}
