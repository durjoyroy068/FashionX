<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->index(['category_id', 'is_active'], 'products_category_active_idx');
            $table->index(['brand_id', 'is_active'], 'products_brand_active_idx');
            $table->index(['seller_id', 'is_active'], 'products_seller_active_idx');
            $table->index('created_at', 'products_created_at_idx');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->index(['user_id', 'status'], 'orders_user_status_idx');
            $table->index('created_at', 'orders_created_at_idx');
        });

        Schema::table('auction_bids', function (Blueprint $table) {
            $table->index('user_id', 'auction_bids_user_id_idx');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_category_active_idx');
            $table->dropIndex('products_brand_active_idx');
            $table->dropIndex('products_seller_active_idx');
            $table->dropIndex('products_created_at_idx');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_user_status_idx');
            $table->dropIndex('orders_created_at_idx');
        });

        Schema::table('auction_bids', function (Blueprint $table) {
            $table->dropIndex('auction_bids_user_id_idx');
        });
    }
};
