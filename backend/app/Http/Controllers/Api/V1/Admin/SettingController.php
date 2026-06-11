<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    use ApiResponse;

    public function index()
    {
        return $this->success([
            'site' => Setting::getValue('site', []),
            'seo' => Setting::getValue('seo', []),
            'social' => Setting::getValue('social', []),
        ]);
    }

    public function update(Request $request)
    {
        $allowed = ['site', 'seo', 'social'];
        $data = $request->validate([
            'settings' => 'required|array',
            'settings.site' => 'sometimes|array',
            'settings.seo' => 'sometimes|array',
            'settings.social' => 'sometimes|array',
        ]);

        foreach ($data['settings'] as $key => $value) {
            if (!in_array($key, $allowed, true) || !is_array($value)) {
                continue;
            }
            Setting::setValue($key, $value);
        }

        return $this->success(null, 'Settings updated');
    }
}
