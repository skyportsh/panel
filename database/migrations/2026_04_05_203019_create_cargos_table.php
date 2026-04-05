<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cargos', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->string('author');
            $table->text('description')->nullable();
            $table->string('source_type')->default('native');
            $table->longText('cargofile');
            $table->json('definition');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cargos');
    }
};
