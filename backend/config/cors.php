<?php

$origins = array_filter(array_map('trim', explode(',', env('ALLOWED_ORIGINS', 'http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:3460,http://127.0.0.1:3456'))));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $origins ?: [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
