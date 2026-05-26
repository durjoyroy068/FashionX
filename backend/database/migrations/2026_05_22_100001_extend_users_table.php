<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('phone', 20)->nullable()->after('last_name');
            $table->string('avatar')->nullable()->after('phone');
            $table->enum('role', ['customer', 'seller', 'admin'])->default('customer')->after('avatar');
            $table->boolean('is_active')->default(true)->after('role');

            $table->index('role');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropIndex(['is_active']);

            $table->dropColumn([
                'first_name',
                'last_name',
                'phone',
                'avatar',
                'role',
                'is_active',
            ]);
        });
    }
};
