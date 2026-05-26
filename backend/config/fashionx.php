<?php

return [
    'payments' => [
        'mode' => env('PAYMENT_MODE', 'sandbox'),
        'stripe' => [
            'key' => env('STRIPE_KEY'),
            'secret' => env('STRIPE_SECRET'),
            'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        ],
        'paypal' => [
            'client_id' => env('PAYPAL_CLIENT_ID'),
            'secret' => env('PAYPAL_SECRET'),
            'return_url' => env('PAYPAL_RETURN_URL'),
        ],
        'sslcommerz' => [
            'store_id' => env('SSLCOMMERZ_STORE_ID'),
            'store_password' => env('SSLCOMMERZ_STORE_PASSWORD'),
            'return_url' => env('SSLCOMMERZ_RETURN_URL'),
        ],
    ],
    'shipping' => [
        'flat_rate' => 25,
        'free_threshold' => 500,
        'tax_rate' => 0.08,
    ],
    'frontend_url' => env('FRONTEND_URL', 'http://127.0.0.1:3456'),
];
