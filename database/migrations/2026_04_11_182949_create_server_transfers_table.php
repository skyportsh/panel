<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('server_transfers')) {
            return;
        }

        Schema::create('server_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained()->cascadeOnDelete();
            $table->foreignId('source_node_id')->constrained('nodes')->cascadeOnDelete();
            $table->foreignId('target_node_id')->constrained('nodes')->cascadeOnDelete();
            $table->foreignId('target_allocation_id')->constrained('allocations')->cascadeOnDelete();
            $table->unsignedBigInteger('archive_size_bytes')->nullable();
            $table->unsignedInteger('progress')->nullable();
            $table->string('status')->default('archiving');
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['server_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_transfers');
    }
};
