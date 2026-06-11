<?php

namespace App\Support;

use Throwable;

final class ApiMessage
{
    public static function from(Throwable $e, string $fallback = 'Error'): string
    {
        if (app()->environment('production')) {
            return $fallback;
        }

        return $e->getMessage() ?: $fallback;
    }

    public static function http(int $status, ?string $message = null): string
    {
        if (!app()->environment('production') && $message) {
            return $message;
        }

        return match ($status) {
            400 => 'Bad request',
            401 => 'Unauthenticated',
            403 => 'Forbidden',
            404 => 'Not found',
            422 => 'Validation failed',
            429 => 'Too many requests',
            default => 'Error',
        };
    }
}
