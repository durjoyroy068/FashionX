<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaUploadService
{
    protected array $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    public function uploadImage(UploadedFile $file, string $folder = 'uploads'): string
    {
        if (!in_array($file->getMimeType(), $this->allowedMimes, true)) {
            throw new \InvalidArgumentException('Invalid image type.');
        }

        if ($file->getSize() > 5 * 1024 * 1024) {
            throw new \InvalidArgumentException('Image must be under 5MB.');
        }

        $name = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs($folder, $name, 'public');

        return Storage::disk('public')->url($path);
    }

    public function deleteByUrl(?string $url): void
    {
        if (!$url) {
            return;
        }
        $prefix = Storage::disk('public')->url('');
        if (!str_starts_with($url, $prefix)) {
            return;
        }
        $relative = ltrim(str_replace($prefix, '', $url), '/');
        Storage::disk('public')->delete($relative);
    }
}
