<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use App\Traits\ApiResponse;

class ContactMessageController extends Controller
{
    use ApiResponse;

    public function index()
    {
        return $this->success(
            ContactMessage::latest()
                ->limit(200)
                ->get()
        );
    }

    public function markRead(string $id)
    {
        $msg = ContactMessage::findOrFail((int) preg_replace('/\D/', '', $id));
        $msg->update(['status' => 'read']);

        return $this->success($msg->fresh(), 'Message marked as read');
    }
}
