<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Services\MediaUploadService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class BannerController extends Controller
{
    use ApiResponse;

    public function index()
    {
        return $this->success(Banner::orderBy('sort_order')->get());
    }

    public function show(Banner $banner)
    {
        return $this->success($banner);
    }

    public function store(Request $request, MediaUploadService $uploader)
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'subtitle' => 'nullable|string',
            'image' => 'nullable|url',
            'file' => 'nullable|image|max:5120',
            'link' => 'nullable|url',
            'position' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
        ]);

        if ($request->hasFile('file')) {
            $data['image'] = $uploader->uploadImage($request->file('file'), 'banners');
        }

        $banner = Banner::create($data);

        return $this->success($banner, 'Banner created', 201);
    }

    public function update(Request $request, Banner $banner, MediaUploadService $uploader)
    {
        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'subtitle' => 'nullable|string',
            'image' => 'nullable|url',
            'file' => 'nullable|image|max:5120',
            'link' => 'nullable|url',
            'position' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
        ]);

        if ($request->hasFile('file')) {
            $uploader->deleteByUrl($banner->image);
            $data['image'] = $uploader->uploadImage($request->file('file'), 'banners');
        }

        $banner->update($data);

        return $this->success($banner->fresh(), 'Banner updated');
    }

    public function destroy(Banner $banner, MediaUploadService $uploader)
    {
        $uploader->deleteByUrl($banner->image);
        $banner->delete();

        return $this->success(null, 'Banner deleted');
    }
}
