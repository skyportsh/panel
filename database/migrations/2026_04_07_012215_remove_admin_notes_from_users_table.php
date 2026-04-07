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
        if (! Schema::hasColumn('users', 'admin_notes')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('admin_notes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('users', 'admin_notes')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->text('admin_notes')->nullable()->after('suspended_at');
        });
    }
};
