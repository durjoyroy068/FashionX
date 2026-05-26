<?php



namespace App\Http\Controllers\Api\V1;



use App\Enums\UserRole;

use App\Http\Controllers\Controller;

use App\Services\MediaUploadService;

use App\Traits\ApiResponse;

use Illuminate\Http\Request;



class MediaController extends Controller

{

    use ApiResponse;



    public function __construct(protected MediaUploadService $uploader) {}



    public function upload(Request $request)

    {

        $data = $request->validate([

            'file' => 'required|image|max:5120',

            'type' => 'required|in:product,banner,avatar,seller',

        ]);



        $user = $request->user();

        $role = $user->role;



        $allowed = match ($data['type']) {

            'avatar' => true,

            'product', 'seller' => $role === UserRole::Seller || $role === UserRole::Admin,

            'banner' => $role === UserRole::Admin,

            default => false,

        };



        if (!$allowed) {

            return $this->error('You are not allowed to upload this media type', 403);

        }



        $folder = match ($data['type']) {

            'product' => 'products',

            'banner' => 'banners',

            'avatar' => 'avatars',

            'seller' => 'sellers',

            default => 'uploads',

        };



        try {

            $url = $this->uploader->uploadImage($request->file('file'), $folder);

        } catch (\InvalidArgumentException $e) {

            return $this->error($e->getMessage(), 422);

        }



        if ($data['type'] === 'avatar') {

            $user->update(['avatar' => $url]);

        }



        return $this->success(['url' => $url, 'path' => $url], 'Uploaded', 201);

    }

}

