<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Traits\ApiResponse;

class CategoryController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $categories = Category::where('is_active', true)
            ->whereNull('parent_id')
            ->with('children')
            ->withCount(['products' => fn ($q) => $q->where('is_active', true)])
            ->orderBy('sort_order')
            ->get()
            ->map(fn ($c) => [
                'id' => 'cat_' . str_pad((string) $c->id, 3, '0', STR_PAD_LEFT),
                'name' => $c->name,
                'slug' => $c->slug,
                'image' => $c->image,
                'count' => $c->products_count,
            ]);

        return $this->success($categories);
    }
}
