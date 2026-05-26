<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    use ApiResponse;

    public function index()
    {
        return $this->success(Coupon::latest()->get());
    }

    public function show(Coupon $coupon)
    {
        return $this->success($coupon);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|unique:coupons,code',
            'type' => 'required|in:percent,fixed',
            'value' => 'required|numeric|min:0',
            'min_order' => 'nullable|numeric|min:0',
            'max_uses' => 'nullable|integer|min:1',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'is_active' => 'boolean',
        ]);
        $data['code'] = strtoupper($data['code']);
        if ($data['type'] === 'percent' && (float) $data['value'] > 100) {
            return $this->error('Percent discount cannot exceed 100', 422);
        }

        $coupon = Coupon::create($data);

        return $this->success($coupon, 'Coupon created', 201);
    }

    public function update(Request $request, Coupon $coupon)
    {
        $data = $request->validate([
            'code' => 'sometimes|string|unique:coupons,code,' . $coupon->id,
            'type' => 'sometimes|in:percent,fixed',
            'value' => 'sometimes|numeric|min:0',
            'min_order' => 'nullable|numeric|min:0',
            'max_uses' => 'nullable|integer|min:1',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date',
            'is_active' => 'boolean',
        ]);
        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }
        $type = $data['type'] ?? $coupon->type;
        $value = isset($data['value']) ? (float) $data['value'] : (float) $coupon->value;
        if ($type === 'percent' && $value > 100) {
            return $this->error('Percent discount cannot exceed 100', 422);
        }
        $coupon->update($data);

        return $this->success($coupon->fresh(), 'Coupon updated');
    }

    public function destroy(Coupon $coupon)
    {
        $coupon->delete();

        return $this->success(null, 'Coupon deleted');
    }
}
