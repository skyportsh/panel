<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('node_credentials', function (Blueprint $table) {
            $table->text('daemon_callback_token')->nullable()->after('daemon_secret_issued_at');
        });
    }

    public function down(): void
    {
        Schema::table('node_credentials', function (Blueprint $table) {
            $table->dropColumn('daemon_callback_token');
        });
    }
};
