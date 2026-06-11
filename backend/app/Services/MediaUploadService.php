<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaUploadService
{
    protected array $allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    protected array $mimeToExt = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    public function uploadImage(UploadedFile $file, string $folder = 'uploads'): string
    {
        $path = $file->getRealPath();
        if (!$path) {
            throw new \InvalidArgumentException('Invalid upload.');
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($path) ?: '';

        if (!in_array($mime, $this->allowedMimes, true)) {
            throw new \InvalidArgumentException('Invalid image type.');
        }

        if (@getimagesize($path) === false) {
            throw new \InvalidArgumentException('File is not a valid image.');
        }

        if ($file->getSize() > 5 * 1024 * 1024) {
            throw new \InvalidArgumentException('Image must be under 5MB.');
        }

        $ext = $this->mimeToExt[$mime] ?? 'bin';
        $name = Str::uuid() . '.' . $ext;
        $stored = $file->storeAs($folder, $name, 'public');

        return Storage::disk('public')->url($stored);
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
