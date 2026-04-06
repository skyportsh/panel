<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('node_id')->constrained()->cascadeOnDelete();
            $table->string('bind_ip')->default('0.0.0.0');
            $table->unsignedInteger('port');
            $table->string('ip_alias')->nullable();
            $table->timestamps();

            $table->unique(['node_id', 'bind_ip', 'port']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('allocations');
    }
};
