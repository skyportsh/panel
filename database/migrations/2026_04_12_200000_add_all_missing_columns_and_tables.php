<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Cargos: add columns the model references but migration missed ──
        Schema::table('cargos', function (Blueprint $table) {
            if (! Schema::hasColumn('cargos', 'features')) {
                $table->json('features')->nullable()->after('description');
            }
            if (! Schema::hasColumn('cargos', 'docker_images')) {
                $table->json('docker_images')->nullable()->after('features');
            }
            if (! Schema::hasColumn('cargos', 'file_denylist')) {
                $table->json('file_denylist')->nullable()->after('docker_images');
            }
            if (! Schema::hasColumn('cargos', 'file_hidden_list')) {
                $table->json('file_hidden_list')->nullable()->after('file_denylist');
            }
            if (! Schema::hasColumn('cargos', 'startup_command')) {
                $table->text('startup_command')->nullable()->after('file_hidden_list');
            }
            if (! Schema::hasColumn('cargos', 'config_files')) {
                $table->text('config_files')->nullable()->after('startup_command');
            }
            if (! Schema::hasColumn('cargos', 'config_startup')) {
                $table->text('config_startup')->nullable()->after('config_files');
            }
            if (! Schema::hasColumn('cargos', 'config_logs')) {
                $table->text('config_logs')->nullable()->after('config_startup');
            }
            if (! Schema::hasColumn('cargos', 'config_stop')) {
                $table->string('config_stop')->nullable()->after('config_logs');
            }
            if (! Schema::hasColumn('cargos', 'install_script')) {
                $table->longText('install_script')->nullable()->after('config_stop');
            }
            if (! Schema::hasColumn('cargos', 'install_container')) {
                $table->string('install_container')->nullable()->after('install_script');
            }
            if (! Schema::hasColumn('cargos', 'install_entrypoint')) {
                $table->string('install_entrypoint')->nullable()->after('install_container');
            }
            if (! Schema::hasColumn('cargos', 'variables')) {
                $table->json('variables')->nullable()->after('install_entrypoint');
            }
        });

        // ── Server Transfers: create the missing table ──
        if (! Schema::hasTable('server_transfers')) {
            Schema::create('server_transfers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('server_id')->constrained()->cascadeOnDelete();
                $table->foreignId('source_node_id')->constrained('nodes')->cascadeOnDelete();
                $table->foreignId('target_node_id')->constrained('nodes')->cascadeOnDelete();
                $table->foreignId('target_allocation_id')->nullable()->constrained('allocations')->nullOnDelete();
                $table->unsignedBigInteger('archive_size_bytes')->default(0);
                $table->unsignedInteger('progress')->default(0);
                $table->string('status')->default('archiving');
                $table->text('error')->nullable();
                $table->timestamps();

                $table->index(['server_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('server_transfers');

        Schema::table('cargos', function (Blueprint $table) {
            $table->dropColumn([
                'features',
                'docker_images',
                'file_denylist',
                'file_hidden_list',
                'startup_command',
                'config_files',
                'config_startup',
                'config_logs',
                'config_stop',
                'install_script',
                'install_container',
                'install_entrypoint',
                'variables',
            ]);
        });
    }
};
