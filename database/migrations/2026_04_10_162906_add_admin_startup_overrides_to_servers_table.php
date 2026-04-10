<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->string('startup_command_override')->nullable()->after('docker_image');
            $table->string('docker_image_override')->nullable()->after('startup_command_override');
        });
    }

    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->dropColumn(['startup_command_override', 'docker_image_override']);
        });
    }
};
