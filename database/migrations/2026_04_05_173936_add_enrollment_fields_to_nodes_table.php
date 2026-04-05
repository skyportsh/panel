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
        Schema::table('nodes', function (Blueprint $table) {
            $table->string('status')->default('draft')->after('use_ssl');
            $table->uuid('daemon_uuid')->nullable()->unique()->after('status');
            $table->string('daemon_version')->nullable()->after('daemon_uuid');
            $table->timestamp('enrolled_at')->nullable()->after('daemon_version');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('nodes', function (Blueprint $table) {
            $table->dropColumn(['status', 'daemon_uuid', 'daemon_version', 'enrolled_at']);
        });
    }
};
