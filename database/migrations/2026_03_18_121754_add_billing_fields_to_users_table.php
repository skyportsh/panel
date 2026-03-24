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
            $table->unsignedBigInteger('coins_balance')->default(0)->after('remember_token');
            $table->bigInteger('credit_balance')->default(0)->after('coins_balance');
            $table->string('preferred_currency', 3)->default('USD')->after('credit_balance');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['coins_balance', 'credit_balance', 'preferred_currency']);
        });
    }
};
