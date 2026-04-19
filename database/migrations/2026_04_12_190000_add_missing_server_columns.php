<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            if (! Schema::hasColumn('servers', 'allocation_id')) {
                $table->foreignId('allocation_id')->nullable()->after('cargo_id')->constrained()->nullOnDelete();
            }
            if (! Schema::hasColumn('servers', 'docker_image')) {
                $table->string('docker_image')->nullable()->after('name');
            }
            if (! Schema::hasColumn('servers', 'startup_command_override')) {
                $table->string('startup_command_override')->nullable()->after('docker_image');
            }
            if (! Schema::hasColumn('servers', 'docker_image_override')) {
                $table->string('docker_image_override')->nullable()->after('startup_command_override');
            }
            if (! Schema::hasColumn('servers', 'backup_limit')) {
                $table->unsignedInteger('backup_limit')->default(0)->after('disk_mib');
            }
            if (! Schema::hasColumn('servers', 'allocation_limit')) {
                $table->unsignedInteger('allocation_limit')->default(0)->after('backup_limit');
            }
            if (! Schema::hasColumn('servers', 'last_error')) {
                $table->text('last_error')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('allocation_id');
            $table->dropColumn([
                'docker_image',
                'startup_command_override',
                'docker_image_override',
                'backup_limit',
                'allocation_limit',
                'last_error',
            ]);
        });
    }
};
