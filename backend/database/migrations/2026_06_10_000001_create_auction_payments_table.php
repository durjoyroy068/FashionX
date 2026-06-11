<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auction_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('auction_id')->nullable()->constrained()->nullOnDelete();
            $table->string('transaction_reference', 128);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('provider', 32)->default('manual');
            $table->string('status', 20)->default('pending');
            $table->json('meta')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'transaction_reference']);
            $table->index(['auction_id', 'status']);
        });

        Schema::table('auction_winners', function (Blueprint $table) {
            $table->string('payment_status', 20)->default('pending')->after('won_at');
            $table->timestamp('paid_at')->nullable()->after('payment_status');
        });
    }

    public function down(): void
    {
        Schema::table('auction_winners', function (Blueprint $table) {
            $table->dropColumn(['payment_status', 'paid_at']);
        });
        Schema::dropIfExists('auction_payments');
    }
};
