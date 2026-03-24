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
        Schema::table('users', function (Blueprint $table) {
            $table->string('account_region', 2)->nullable()->after('preferred_currency');
            $table->string('registration_ip', 45)->nullable()->after('account_region');
            $table->string('last_seen_ip', 45)->nullable()->after('registration_ip');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['account_region', 'registration_ip', 'last_seen_ip']);
        });
    }
};
