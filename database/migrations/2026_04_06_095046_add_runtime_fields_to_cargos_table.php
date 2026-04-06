<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cargos', function (Blueprint $table) {
            $table->json('features')->nullable()->after('description');
            $table->json('docker_images')->nullable()->after('features');
            $table->json('file_denylist')->nullable()->after('docker_images');
            $table->json('file_hidden_list')->nullable()->after('file_denylist');
            $table->text('startup_command')->nullable()->after('file_hidden_list');
            $table->longText('config_files')->nullable()->after('startup_command');
            $table->longText('config_startup')->nullable()->after('config_files');
            $table->longText('config_logs')->nullable()->after('config_startup');
            $table->text('config_stop')->nullable()->after('config_logs');
            $table->longText('install_script')->nullable()->after('config_stop');
            $table->text('install_container')->nullable()->after('install_script');
            $table->string('install_entrypoint')->nullable()->after('install_container');
            $table->json('variables')->nullable()->after('install_entrypoint');
        });

        DB::table('cargos')->orderBy('id')->eachById(function (object $cargo): void {
            $definition = json_decode($cargo->definition, true);

            if (! is_array($definition)) {
                return;
            }

            DB::table('cargos')
                ->where('id', $cargo->id)
                ->update([
                    'features' => json_encode($definition['features'] ?? [], JSON_THROW_ON_ERROR),
                    'docker_images' => json_encode($definition['docker_images'] ?? [], JSON_THROW_ON_ERROR),
                    'file_denylist' => json_encode($definition['file_denylist'] ?? [], JSON_THROW_ON_ERROR),
                    'file_hidden_list' => json_encode($definition['file_hidden_list'] ?? [], JSON_THROW_ON_ERROR),
                    'startup_command' => $definition['startup'] ?? null,
                    'config_files' => $definition['config']['files'] ?? '{}',
                    'config_startup' => $definition['config']['startup'] ?? '{}',
                    'config_logs' => $definition['config']['logs'] ?? '{}',
                    'config_stop' => $definition['config']['stop'] ?? 'stop',
                    'install_script' => $definition['scripts']['installation']['script'] ?? '',
                    'install_container' => $definition['scripts']['installation']['container'] ?? '',
                    'install_entrypoint' => $definition['scripts']['installation']['entrypoint'] ?? '',
                    'variables' => json_encode($definition['variables'] ?? [], JSON_THROW_ON_ERROR),
                ]);
        });
    }

    public function down(): void
    {
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
