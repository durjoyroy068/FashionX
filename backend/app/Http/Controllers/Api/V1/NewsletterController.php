<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\NewsletterSubscriber;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class NewsletterController extends Controller
{
    use ApiResponse;

    public function subscribe(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email|max:190',
            'source' => 'nullable|string|max:120',
        ]);

        NewsletterSubscriber::updateOrCreate(
            ['email' => strtolower(trim($data['email']))],
            [
                'is_active' => true,
                'source' => $data['source'] ?? 'storefront',
                'subscribed_at' => now(),
            ]
        );

        return $this->success(null, 'Subscribed successfully', 201);
    }
}
