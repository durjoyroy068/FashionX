<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\NewsletterSubscriber;
use App\Traits\ApiResponse;

class NewsletterSubscriberController extends Controller
{
    use ApiResponse;

    public function index()
    {
        return $this->success(
            NewsletterSubscriber::latest()
                ->limit(500)
                ->get()
        );
    }

    public function destroy(string $id)
    {
        $subscriber = NewsletterSubscriber::findOrFail((int) preg_replace('/\D/', '', $id));
        $subscriber->update(['is_active' => false]);

        return $this->success(null, 'Subscriber deactivated');
    }
}
