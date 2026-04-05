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
        Schema::table('user_activities', function (Blueprint $table) {
            $columns = [
                'ip_address',
                'country_code',
                'country_name',
            ];

            $existingColumns = array_values(array_filter(
                $columns,
                fn (string $column): bool => Schema::hasColumn('user_activities', $column),
            ));

            if ($existingColumns !== []) {
                $table->dropColumn($existingColumns);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_activities', function (Blueprint $table) {
            if (! Schema::hasColumn('user_activities', 'ip_address')) {
                $table->string('ip_address', 45)->nullable()->after('path');
            }

            if (! Schema::hasColumn('user_activities', 'country_code')) {
                $table->string('country_code', 2)->nullable()->after('ip_address');
            }

            if (! Schema::hasColumn('user_activities', 'country_name')) {
                $table->string('country_name')->nullable()->after('country_code');
            }
        });
    }
};
