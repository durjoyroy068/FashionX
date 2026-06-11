<?php

namespace App\Http\Controllers\Api\V1\Seller;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductImage;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $seller = $request->user()->seller;
        if (!$seller) {
            return response()->json(['success' => false, 'message' => 'Seller profile required'], 403);
        }

        $products = Product::with(['images', 'brand', 'category'])
            ->where('seller_id', $seller->id)
            ->latest()
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => ProductResource::collection($products->getCollection())->resolve(),
            'meta' => ['total' => $products->total()],
        ]);
    }

    public function store(Request $request)
    {
        $seller = $request->user()->seller;
        if (!$seller) {
            return response()->json(['success' => false, 'message' => 'Seller not approved'], 403);
        }

        $request->merge([
            'category_id' => (int) preg_replace('/\D/', '', (string) $request->input('category_id')),
        ]);

        if ($request->filled('brand_id')) {
            $request->merge([
                'brand_id' => (int) preg_replace('/\D/', '', (string) $request->input('brand_id')),
            ]);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'brand_id' => 'required_without:brand_name|nullable|integer|exists:brands,id',
            'brand_name' => 'required_without:brand_id|nullable|string|min:2|max:255',
            'category_id' => 'required|exists:categories,id',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'description' => 'nullable|string',
            'images' => 'nullable|array',
            'images.*' => 'url',
        ]);

        if (!empty($data['brand_id']) && !empty($data['brand_name'])) {
            return $this->error('Select an existing brand or enter a new brand name, not both.', 422);
        }

        $brandId = $this->resolveBrandId($data);
        $product = Product::create([
            'name' => $data['name'],
            'brand_id' => $brandId,
            'category_id' => $data['category_id'],
            'price' => $data['price'],
            'stock' => $data['stock'],
            'description' => $data['description'] ?? null,
            'seller_id' => $seller->id,
            'slug' => Str::slug($data['name']) . '-' . uniqid(),
            'sku' => 'FX-' . strtoupper(Str::random(8)),
            'is_active' => true,
        ]);

        foreach ($data['images'] ?? [] as $i => $url) {
            ProductImage::create([
                'product_id' => $product->id,
                'path' => $url,
                'sort_order' => $i,
                'is_primary' => $i === 0,
            ]);
        }

        return $this->success(new ProductResource($product->load('images')), 'Product created', 201);
    }

    public function show(string $id)
    {
        $product = $this->findSellerProduct(request(), $id);

        return $this->success(new ProductResource($product->load('images', 'variants')));
    }

    public function update(Request $request, string $id)
    {
        $product = $this->findSellerProduct($request, $id);
        $product->update($request->validate([
            'name' => 'sometimes|string|max:255',
            'price' => 'sometimes|numeric|min:0',
            'discount_price' => 'nullable|numeric|min:0',
            'stock' => 'sometimes|integer|min:0',
            'description' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]));

        return $this->success(new ProductResource($product->fresh()), 'Product updated');
    }

    public function destroy(Request $request, string $id)
    {
        $this->findSellerProduct($request, $id)->delete();

        return $this->success(null, 'Product deleted');
    }

    protected function findSellerProduct(Request $request, string $id): Product
    {
        $seller = $request->user()->seller;

        return Product::where('seller_id', $seller->id)
            ->where('id', (int) preg_replace('/\D/', '', $id))
            ->firstOrFail();
    }

    protected function resolveBrandId(array $data): int
    {
        if (!empty($data['brand_name'])) {
            $name = trim($data['brand_name']);

            $existing = Brand::whereRaw('LOWER(name) = ?', [strtolower($name)])->first();
            if ($existing) {
                return (int) $existing->id;
            }

            $baseSlug = Str::slug($name) ?: 'brand';
            $slug = $baseSlug;
            $suffix = 1;
            while (Brand::where('slug', $slug)->exists()) {
                $slug = $baseSlug . '-' . $suffix++;
            }

            $brand = Brand::create([
                'name' => $name,
                'slug' => $slug,
                'verified' => false,
                'product_count' => 0,
            ]);

            return (int) $brand->id;
        }

        return (int) $data['brand_id'];
    }
}
