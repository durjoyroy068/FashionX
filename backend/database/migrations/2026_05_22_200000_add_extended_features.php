<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->boolean('is_spam')->default(false)->after('is_approved');
            $table->text('rejection_reason')->nullable()->after('is_spam');
            $table->timestamp('reported_at')->nullable()->after('rejection_reason');
        });

        Schema::create('auction_winners', function (Blueprint $table) {
            $table->id();
            $table->foreignId('auction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('bid_id')->nullable()->constrained('auction_bids')->nullOnDelete();
            $table->decimal('winning_amount', 12, 2);
            $table->timestamp('won_at');
            $table->timestamps();

            $table->unique('auction_id');
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('properties')->nullable();
            $table->string('ip', 45)->nullable();
            $table->timestamps();

            $table->index(['subject_type', 'subject_id']);
            $table->index('action');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
        Schema::dropIfExists('auction_winners');
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn(['is_spam', 'rejection_reason', 'reported_at']);
        });
    }
};
