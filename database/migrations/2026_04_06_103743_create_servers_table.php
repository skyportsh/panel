<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('servers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('node_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cargo_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('memory_mib');
            $table->unsignedInteger('cpu_limit')->default(0);
            $table->unsignedInteger('disk_mib');
            $table->string('status')->default('pending');
            $table->timestamps();

            $table->index('name');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('servers');
    }
};
