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
            $columns = [
                'coins_balance',
                'credit_balance',
                'preferred_currency',
                'preferred_currency_overridden',
                'account_region',
                'registration_ip',
                'last_seen_ip',
            ];

            $existingColumns = array_values(array_filter(
                $columns,
                fn (string $column): bool => Schema::hasColumn('users', $column),
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
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'coins_balance')) {
                $table->unsignedBigInteger('coins_balance')->default(0)->nullable(false)->after('remember_token');
            }

            if (! Schema::hasColumn('users', 'credit_balance')) {
                $table->bigInteger('credit_balance')->default(0)->nullable(false)->after('coins_balance');
            }

            if (! Schema::hasColumn('users', 'preferred_currency')) {
                $table->string('preferred_currency', 3)->default('USD')->nullable(false)->after('credit_balance');
            }

            if (! Schema::hasColumn('users', 'preferred_currency_overridden')) {
                $table->boolean('preferred_currency_overridden')->default(false)->nullable(false)->after('preferred_currency');
            }

            if (! Schema::hasColumn('users', 'account_region')) {
                $table->string('account_region', 2)->nullable()->after('preferred_currency_overridden');
            }

            if (! Schema::hasColumn('users', 'registration_ip')) {
                $table->string('registration_ip', 45)->nullable()->after('account_region');
            }

            if (! Schema::hasColumn('users', 'last_seen_ip')) {
                $table->string('last_seen_ip', 45)->nullable()->after('registration_ip');
            }
        });
    }
};
