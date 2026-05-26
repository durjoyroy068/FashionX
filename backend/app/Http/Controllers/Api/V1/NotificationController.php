<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $notes = Notification::where('user_id', $request->user()->id)
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn ($n) => [
                'id' => $n->id,
                'title' => $n->title,
                'msg' => $n->message,
                'message' => $n->message,
                'type' => $n->type,
                'unread' => $n->read_at === null,
                'time' => $n->created_at?->diffForHumans(),
                'created_at' => $n->created_at?->toIso8601String(),
            ]);

        return $this->success($notes);
    }

    public function markRead(Request $request, string $id)
    {
        Notification::where('user_id', $request->user()->id)
            ->where('id', (int) preg_replace('/\D/', '', $id))
            ->update(['read_at' => now()]);

        return $this->success(null, 'Marked as read');
    }

    public function markAllRead(Request $request)
    {
        Notification::where('user_id', $request->user()->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $this->success(null, 'All marked as read');
    }
}
