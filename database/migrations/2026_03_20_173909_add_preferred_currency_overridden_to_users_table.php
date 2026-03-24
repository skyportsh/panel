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
            $table->boolean('preferred_currency_overridden')->default(false)->after('preferred_currency');
        });

        $regionCurrencies = [
            'AT' => 'EUR',
            'AU' => 'AUD',
            'BE' => 'EUR',
            'CA' => 'CAD',
            'CY' => 'EUR',
            'DE' => 'EUR',
            'EE' => 'EUR',
            'ES' => 'EUR',
            'FI' => 'EUR',
            'FR' => 'EUR',
            'GB' => 'GBP',
            'GR' => 'EUR',
            'HR' => 'EUR',
            'IE' => 'EUR',
            'IT' => 'EUR',
            'JP' => 'JPY',
            'LT' => 'EUR',
            'LU' => 'EUR',
            'LV' => 'EUR',
            'MT' => 'EUR',
            'NL' => 'EUR',
            'PT' => 'EUR',
            'SI' => 'EUR',
            'SK' => 'EUR',
            'US' => 'USD',
        ];

        foreach ($regionCurrencies as $region => $currency) {
            \Illuminate\Support\Facades\DB::table('users')
                ->where('account_region', $region)
                ->where('preferred_currency', '!=', $currency)
                ->update(['preferred_currency_overridden' => true]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('preferred_currency_overridden');
        });
    }
};
