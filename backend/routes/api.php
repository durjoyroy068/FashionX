<?php

use App\Http\Controllers\Api\V1\Admin\BannerController as AdminBannerController;
use App\Http\Controllers\Api\V1\Admin\ContactMessageController as AdminContactMessageController;
use App\Http\Controllers\Api\V1\Admin\CouponController as AdminCouponController;
use App\Http\Controllers\Api\V1\Admin\DashboardController;
use App\Http\Controllers\Api\V1\Admin\NewsletterSubscriberController as AdminNewsletterSubscriberController;
use App\Http\Controllers\Api\V1\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Api\V1\Admin\SellerController as AdminSellerController;
use App\Http\Controllers\Api\V1\Admin\SettingController as AdminSettingController;
use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\V1\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Api\V1\AuctionController;
use App\Http\Controllers\Api\V1\AuctionPaymentController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\SellerController;
use App\Http\Controllers\Api\V1\ShippingAddressController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\CategoryController;
use App\Http\Controllers\Api\V1\CheckoutController;
use App\Http\Controllers\Api\V1\ContactController;
use App\Http\Controllers\Api\V1\MediaController;
use App\Http\Controllers\Api\V1\NewsletterController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\ReviewController;
use App\Http\Controllers\Api\V1\WishlistController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', function () {
        $dbOk = true;
        try {
            \Illuminate\Support\Facades\DB::connection()->getPdo();
        } catch (\Exception $e) {
            $dbOk = false;
        }

        return response()->json([
            'success' => $dbOk,
            'message' => 'FashionX API',
            'database' => $dbOk ? 'connected' : 'disconnected',
            'version' => '1.0.0',
        ], $dbOk ? 200 : 503);
    });

    Route::post('/auth/register', [AuthController::class, 'register'])
        ->middleware(app()->environment('local', 'testing') ? 'throttle:15,1' : 'throttle:5,1');
    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware(app()->environment('local', 'testing') ? 'throttle:30,1' : 'throttle:10,1');
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:3,5');
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:5,1');
    Route::get('/auth/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
        ->middleware('signed')
        ->name('api.verification.verify');

    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/{id}/reviews', [ReviewController::class, 'index']);
    Route::get('/products/{id}', [ProductController::class, 'show']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/brands', [BrandController::class, 'index']);
    Route::get('/brands/{id}', [BrandController::class, 'show']);
    Route::get('/sellers', [SellerController::class, 'index']);
    Route::get('/sellers/{id}', [SellerController::class, 'show']);
    Route::get('/auctions', [AuctionController::class, 'index']);
    Route::get('/auctions/{id}', [AuctionController::class, 'show']);
    Route::get('/auctions/{id}/bids', [AuctionController::class, 'bids']);
    Route::get('/settings/public', function () {
        return response()->json([
            'success' => true,
            'data' => [
                'site' => \App\Models\Setting::getValue('site', []),
                'seo' => \App\Models\Setting::getValue('seo', []),
                'social' => \App\Models\Setting::getValue('social', []),
            ],
        ]);
    });

    Route::get('/banners', function () {
        $banners = \App\Models\Banner::where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', now());
            })
            ->orderBy('sort_order')
            ->get();

        return response()->json(['success' => true, 'data' => $banners]);
    });

    Route::post('/contact', [ContactController::class, 'store'])
        ->middleware('throttle:5,1');
    Route::post('/newsletter/subscribe', [NewsletterController::class, 'subscribe'])
        ->middleware('throttle:5,1');

    Route::post('/payments/webhook/{provider}', [PaymentController::class, 'webhook'])
        ->middleware('throttle:60,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
        Route::post('/auth/email/resend', [AuthController::class, 'resendVerification']);

        Route::post('/media/upload', [MediaController::class, 'upload']);

        Route::post('/checkout/cart', [CheckoutController::class, 'fromCart']);
        Route::post('/checkout/validate-coupon', [CheckoutController::class, 'validateCoupon']);

        Route::post('/orders', [OrderController::class, 'store']);
        Route::get('/orders', [OrderController::class, 'index']);
        Route::get('/orders/{id}', [OrderController::class, 'show']);
        Route::get('/orders/{id}/tracking', [OrderController::class, 'tracking']);
        Route::get('/orders/{id}/invoice', [OrderController::class, 'invoice']);

        Route::get('/cart', [CartController::class, 'index']);
        Route::post('/cart', [CartController::class, 'store']);
        Route::post('/cart/sync', [CartController::class, 'sync']);
        Route::put('/cart/{productId}', [CartController::class, 'update']);
        Route::delete('/cart/{productId}', [CartController::class, 'destroy']);

        Route::get('/wishlist', [WishlistController::class, 'index']);
        Route::post('/wishlist', [WishlistController::class, 'store']);
        Route::delete('/wishlist/{productId}', [WishlistController::class, 'destroy']);

        Route::post('/reviews', [ReviewController::class, 'store']);
        Route::post('/reviews/{id}/report', [ReviewController::class, 'report']);

        Route::post('/auctions/{id}/bids', [AuctionController::class, 'placeBid'])
            ->middleware('throttle:10,1');
        Route::get('/me/auction-bids', [AuctionController::class, 'myBids']);
        Route::post('/auctions/payments/verify', [AuctionPaymentController::class, 'verify']);
        Route::get('/auctions/payments/status', [AuctionPaymentController::class, 'status']);

        Route::get('/payments/{id}', [PaymentController::class, 'show']);

        Route::get('/addresses', [ShippingAddressController::class, 'index']);
        Route::post('/addresses', [ShippingAddressController::class, 'store']);
        Route::delete('/addresses/{id}', [ShippingAddressController::class, 'destroy']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);

        Route::middleware('role:admin')->prefix('admin')->group(function () {
            Route::get('/dashboard', [DashboardController::class, 'index']);
            Route::get('/users', [AdminUserController::class, 'index']);
            Route::patch('/users/{id}', [AdminUserController::class, 'update']);
            Route::get('/sellers', [AdminSellerController::class, 'index']);
            Route::patch('/sellers/{id}/approve', [AdminSellerController::class, 'approve']);
            Route::patch('/sellers/{id}/reject', [AdminSellerController::class, 'reject']);
            Route::get('/orders', [AdminOrderController::class, 'index']);
            Route::patch('/orders/{id}/status', [AdminOrderController::class, 'updateStatus']);
            Route::get('/products', [AdminProductController::class, 'index']);
            Route::patch('/products/{id}', [AdminProductController::class, 'update']);
            Route::delete('/products/{id}', [AdminProductController::class, 'destroy']);
            Route::apiResource('banners', AdminBannerController::class);
            Route::apiResource('coupons', AdminCouponController::class);
            Route::get('/settings', [AdminSettingController::class, 'index']);
            Route::put('/settings', [AdminSettingController::class, 'update']);
            Route::get('/reviews', [AdminReviewController::class, 'index']);
            Route::patch('/reviews/{id}/approve', [AdminReviewController::class, 'approve']);
            Route::patch('/reviews/{id}/reject', [AdminReviewController::class, 'reject']);
            Route::patch('/reviews/{id}/spam', [AdminReviewController::class, 'markSpam']);
            Route::delete('/reviews/{id}', [AdminReviewController::class, 'destroy']);
            Route::get('/contact-messages', [AdminContactMessageController::class, 'index']);
            Route::patch('/contact-messages/{id}/read', [AdminContactMessageController::class, 'markRead']);
            Route::get('/newsletter-subscribers', [AdminNewsletterSubscriberController::class, 'index']);
            Route::delete('/newsletter-subscribers/{id}', [AdminNewsletterSubscriberController::class, 'destroy']);
        });

        Route::middleware(['role:seller,admin', 'seller.approved'])->prefix('seller')->group(function () {
            Route::apiResource('products', \App\Http\Controllers\Api\V1\Seller\ProductController::class);
            Route::get('/orders', [\App\Http\Controllers\Api\V1\Seller\OrderController::class, 'index']);
            Route::get('/analytics', [\App\Http\Controllers\Api\V1\Seller\AnalyticsController::class, 'index']);
            Route::get('/payouts/summary', [\App\Http\Controllers\Api\V1\Seller\PayoutController::class, 'summary']);
            Route::apiResource('auctions', \App\Http\Controllers\Api\V1\Seller\AuctionController::class);
        });
    });
});
