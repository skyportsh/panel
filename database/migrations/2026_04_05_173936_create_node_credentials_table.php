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
        Schema::create('node_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('node_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('enrollment_token_hash', 64)->nullable()->unique();
            $table->timestamp('enrollment_expires_at')->nullable();
            $table->timestamp('enrollment_used_at')->nullable();
            $table->string('daemon_secret_hash', 64)->nullable()->unique();
            $table->timestamp('daemon_secret_issued_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('node_credentials');
    }
};
