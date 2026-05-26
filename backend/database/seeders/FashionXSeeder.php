<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Auction;
use App\Models\Banner;
use App\Models\Brand;
use App\Models\Coupon;
use App\Models\Setting;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use App\Models\Seller;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class FashionXSeeder extends Seeder
{
    protected string $dataPath;

    public function run(): void
    {
        $this->dataPath = dirname(base_path()) . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'data';

        $this->seedDemoUsers();
        $this->seedCategories();
        $this->seedBrands();
        $this->seedSellers();
        $this->seedProducts();
        $this->seedAuctions();
        $this->seedCoupons();
        $this->seedSettings();
    }

    protected function seedCoupons(): void
    {
        $coupons = [
            ['code' => 'LUXURY10', 'type' => 'percent', 'value' => 10],
            ['code' => 'FASHIONX20', 'type' => 'percent', 'value' => 20],
            ['code' => 'VIP15', 'type' => 'percent', 'value' => 15],
        ];
        foreach ($coupons as $c) {
            Coupon::updateOrCreate(['code' => $c['code']], [
                ...$c,
                'is_active' => true,
                'max_uses' => 1000,
            ]);
        }
    }

    protected function seedSettings(): void
    {
        if (Banner::where('position', 'home')->doesntExist()) {
            Banner::create([
                'title' => 'Where Elegance Meets Exclusivity',
                'subtitle' => 'Luxury Redefined',
                'image' => 'https://images.pexels.com/photos/1045547/pexels-photo-1045547.jpeg?auto=compress&cs=tinysrgb&w=1600',
                'link' => '/pages/shop.html',
                'position' => 'home',
                'sort_order' => 0,
                'is_active' => true,
            ]);
        }
        Setting::setValue('site', [
            'name' => 'FashionX',
            'tagline' => 'Premium Multi-Vendor Luxury Fashion',
            'logo' => null,
            'contact_email' => 'hello@fashionx.com',
            'contact_phone' => '+1 800 555 0199',
        ]);
        Setting::setValue('seo', [
            'title' => 'FashionX — Luxury Fashion Marketplace',
            'description' => 'Shop premium watches, perfumes, custom fashion and more.',
            'keywords' => 'luxury,fashion,watches,perfumes',
        ]);
        Setting::setValue('social', [
            'instagram' => 'https://instagram.com/fashionx',
            'twitter' => 'https://twitter.com/fashionx',
            'facebook' => 'https://facebook.com/fashionx',
        ]);
    }

    protected function seedDemoUsers(): void
    {
        $password = Hash::make('FashionX1!');

        $buyer = User::updateOrCreate(
            ['email' => 'demo@fashionx.com'],
            [
                'name' => 'Alexandra Chen',
                'first_name' => 'Alexandra',
                'last_name' => 'Chen',
                'password' => $password,
                'role' => UserRole::Customer,
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
        $buyer->syncRoles(['customer']);

        $sellerUser = User::updateOrCreate(
            ['email' => 'seller@fashionx.com'],
            [
                'name' => 'Marcus Bellini',
                'first_name' => 'Marcus',
                'last_name' => 'Bellini',
                'password' => $password,
                'role' => UserRole::Seller,
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
        $sellerUser->syncRoles(['seller']);

        $admin = User::updateOrCreate(
            ['email' => 'admin@fashionx.com'],
            [
                'name' => 'FashionX Admin',
                'first_name' => 'FashionX',
                'last_name' => 'Admin',
                'password' => $password,
                'role' => UserRole::Admin,
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
        $admin->syncRoles(['admin']);
    }

    protected function seedCategories(): void
    {
        foreach ($this->loadJson('categories.json') as $row) {
            Category::updateOrCreate(
                ['id' => $this->numericId($row['id'])],
                [
                    'name' => $row['name'],
                    'slug' => $row['slug'],
                    'image' => $row['image'] ?? null,
                    'sort_order' => $this->numericId($row['id']),
                    'is_active' => true,
                ]
            );
        }
    }

    protected function seedBrands(): void
    {
        foreach ($this->loadJson('brands.json') as $row) {
            Brand::updateOrCreate(
                ['id' => $this->numericId($row['id'])],
                [
                    'name' => $row['name'],
                    'slug' => Str::slug($row['name']),
                    'logo' => $row['logo'] ?? null,
                    'description' => $row['description'] ?? null,
                    'country' => $this->countryCode($row['country'] ?? null),
                    'verified' => (bool) ($row['verified'] ?? false),
                    'product_count' => (int) ($row['productCount'] ?? $row['product_count'] ?? 0),
                ]
            );
        }
    }

    protected function seedSellers(): void
    {
        $sellerUser = User::where('email', 'seller@fashionx.com')->first();

        foreach ($this->loadJson('sellers.json') as $row) {
            $id = $this->numericId($row['id']);
            $userId = $id === 1 && $sellerUser ? $sellerUser->id : null;

            if (!$userId) {
                $user = User::updateOrCreate(
                    ['email' => 'seller' . $id . '@fashionx.com'],
                    [
                        'name' => $row['name'],
                        'first_name' => explode(' ', $row['name'])[0] ?? 'Seller',
                        'last_name' => explode(' ', $row['name'])[1] ?? (string) $id,
                        'password' => Hash::make('FashionX1!'),
                        'role' => UserRole::Seller,
                        'is_active' => true,
                    ]
                );
                $user->syncRoles(['seller']);
                $userId = $user->id;
            }

            Seller::updateOrCreate(
                ['id' => $id],
                [
                    'user_id' => $userId,
                    'business_name' => $row['name'],
                    'slug' => $row['slug'] ?? Str::slug($row['name']),
                    'description' => $row['description'] ?? null,
                    'logo' => $row['logo'] ?? null,
                    'status' => 'approved',
                    'verified' => (bool) ($row['verified'] ?? true),
                    'location' => $row['location'] ?? null,
                    'rating' => (float) ($row['rating'] ?? 0),
                    'sales_count' => (int) ($row['salesCount'] ?? $row['sales'] ?? 0),
                ]
            );
        }
    }

    protected function seedProducts(): void
    {
        foreach ($this->loadJson('products.json') as $row) {
            $id = $this->numericId($row['id']);
            $sellerId = $this->numericId($row['sellerId']);
            $brandId = isset($row['brandId']) ? $this->numericId($row['brandId']) : null;
            $category = Category::where('slug', $row['category'])->first();
            if (!$category) {
                continue;
            }

            $product = Product::updateOrCreate(
                ['id' => $id],
                [
                    'seller_id' => $sellerId,
                    'brand_id' => $brandId,
                    'category_id' => $category->id,
                    'name' => $row['name'],
                    'slug' => Str::slug($row['name']) . '-' . $id,
                    'sku' => 'FX-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT),
                    'description' => $row['description'] ?? null,
                    'materials' => $row['materials'] ?? null,
                    'packaging' => $row['packaging'] ?? null,
                    'price' => $row['price'],
                    'discount_price' => $row['discountPrice'] ?? null,
                    'stock' => (int) ($row['stock'] ?? 0),
                    'rating' => (float) ($row['rating'] ?? 0),
                    'review_count' => (int) ($row['reviewCount'] ?? 0),
                    'featured' => (bool) ($row['featured'] ?? false),
                    'badges' => $row['badges'] ?? [],
                    'delivery_days' => $this->parseDeliveryDays($row['deliveryDays'] ?? 7),
                    'is_active' => true,
                ]
            );

            $product->images()->delete();
            foreach ($row['images'] ?? [] as $i => $url) {
                ProductImage::create([
                    'product_id' => $product->id,
                    'path' => $url,
                    'sort_order' => $i,
                    'is_primary' => $i === 0,
                ]);
            }

            $product->variants()->delete();
            foreach ($row['variants'] ?? [] as $variant) {
                ProductVariant::create([
                    'product_id' => $product->id,
                    'name' => $variant,
                    'sku' => $product->sku . '-' . Str::upper(Str::slug($variant, '')),
                    'stock' => $product->stock,
                ]);
            }
        }
    }

    protected function seedAuctions(): void
    {
        if (!file_exists($this->dataPath . DIRECTORY_SEPARATOR . 'auctions.json')) {
            return;
        }

        foreach ($this->loadJson('auctions.json') as $row) {
            $id = $this->numericId($row['id']);
            Auction::updateOrCreate(
                ['id' => $id],
                [
                    'seller_id' => $this->numericId($row['sellerId'] ?? 'sel_001'),
                    'brand_id' => isset($row['brandId']) ? $this->numericId($row['brandId']) : null,
                    'category_id' => isset($row['categoryId'])
                        ? $this->numericId($row['categoryId'])
                        : Category::where('slug', $row['category'] ?? '')->value('id'),
                    'title' => $row['title'] ?? $row['name'] ?? 'Auction Item',
                    'slug' => Str::slug($row['title'] ?? $row['name'] ?? 'auction') . '-' . $id,
                    'description' => $row['description'] ?? null,
                    'starting_bid' => $row['startingBid'] ?? $row['currentBid'] ?? 100,
                    'current_bid' => $row['currentBid'] ?? $row['startingBid'] ?? 100,
                    'reserve_price' => $row['reservePrice'] ?? null,
                    'bid_increment' => $row['bidIncrement'] ?? 50,
                    'end_time' => now()->addDays((int) ($row['daysLeft'] ?? 3)),
                    'status' => 'active',
                    'image' => $row['image'] ?? ($row['images'][0] ?? null),
                ]
            );
        }
    }

    protected function loadJson(string $file): array
    {
        $path = $this->dataPath . DIRECTORY_SEPARATOR . $file;
        if (!file_exists($path)) {
            return [];
        }

        return json_decode(file_get_contents($path), true) ?: [];
    }

    protected function numericId(string $id): int
    {
        return (int) preg_replace('/\D/', '', $id);
    }

    protected function countryCode(?string $country): ?string
    {
        if (!$country) {
            return null;
        }
        $map = [
            'France' => 'FR',
            'Italy' => 'IT',
            'Switzerland' => 'CH',
            'United Kingdom' => 'GB',
            'UK' => 'GB',
            'USA' => 'US',
            'United States' => 'US',
        ];

        return $map[$country] ?? strtoupper(substr($country, 0, 2));
    }

    protected function parseDeliveryDays(mixed $value): int
    {
        if (is_numeric($value)) {
            return (int) $value;
        }
        if (preg_match('/(\d+)/', (string) $value, $m)) {
            return (int) $m[1];
        }

        return 7;
    }
}
