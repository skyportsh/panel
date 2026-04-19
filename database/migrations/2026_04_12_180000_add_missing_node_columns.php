<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('node_credentials', function (Blueprint $table) {
            if (! Schema::hasColumn('node_credentials', 'daemon_callback_token')) {
                $table->text('daemon_callback_token')->nullable()->after('daemon_secret_issued_at');
            }
        });

        Schema::table('nodes', function (Blueprint $table) {
            if (! Schema::hasColumn('nodes', 'status')) {
                $table->string('status')->default('draft')->after('use_ssl');
            }
            if (! Schema::hasColumn('nodes', 'enrolled_at')) {
                $table->timestamp('enrolled_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('nodes', 'last_seen_at')) {
                $table->timestamp('last_seen_at')->nullable()->after('enrolled_at');
            }
            if (! Schema::hasColumn('nodes', 'daemon_uuid')) {
                $table->string('daemon_uuid')->nullable()->after('last_seen_at');
            }
            if (! Schema::hasColumn('nodes', 'daemon_version')) {
                $table->string('daemon_version')->nullable()->after('daemon_uuid');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'is_admin')) {
                $table->boolean('is_admin')->default(false)->after('password');
            }
            if (! Schema::hasColumn('users', 'suspended_at')) {
                $table->timestamp('suspended_at')->nullable()->after('is_admin');
            }
        });
    }

    public function down(): void
    {
        Schema::table('node_credentials', function (Blueprint $table) {
            $table->dropColumn('daemon_callback_token');
        });

        Schema::table('nodes', function (Blueprint $table) {
            $table->dropColumn(['status', 'enrolled_at', 'last_seen_at', 'daemon_uuid', 'daemon_version']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_admin', 'suspended_at']);
        });
    }
};
