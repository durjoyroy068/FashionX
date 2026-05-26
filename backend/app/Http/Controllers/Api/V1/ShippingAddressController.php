<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ShippingAddress;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class ShippingAddressController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $addresses = ShippingAddress::where('user_id', $request->user()->id)
            ->orderByDesc('is_default')
            ->get()
            ->map(fn ($a) => $this->format($a));

        return $this->success($addresses);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'label' => 'nullable|string|max:50',
            'line1' => 'required|string|max:255',
            'line2' => 'nullable|string|max:255',
            'city' => 'required|string|max:100',
            'state' => 'nullable|string|max:100',
            'postal_code' => 'required|string|max:20',
            'country_code' => 'required|string|size:2',
            'is_default' => 'boolean',
        ]);

        if ($data['is_default'] ?? false) {
            ShippingAddress::where('user_id', $request->user()->id)->update(['is_default' => false]);
        }

        $address = ShippingAddress::create([
            ...$data,
            'user_id' => $request->user()->id,
        ]);

        return $this->success($this->format($address), 'Address saved', 201);
    }

    public function destroy(Request $request, string $id)
    {
        ShippingAddress::where('user_id', $request->user()->id)
            ->where('id', (int) preg_replace('/\D/', '', $id))
            ->delete();

        return $this->success(null, 'Address deleted');
    }

    protected function format(ShippingAddress $a): array
    {
        return [
            'id' => $a->id,
            'name' => $a->label ?? 'Address',
            'label' => $a->label,
            'line1' => $a->line1,
            'line2' => $a->line2,
            'city' => $a->city,
            'state' => $a->state,
            'zip' => $a->postal_code,
            'postal_code' => $a->postal_code,
            'country_code' => $a->country_code,
            'default' => $a->is_default,
        ];
    }
}
