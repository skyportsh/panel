<?php

namespace App\Services;

use App\Models\Server;

class ServerConfigurationService
{
    /**
     * @return array{
     *     cargo: array{
     *         config_files: string,
     *         config_logs: string,
     *         config_startup: string,
     *         config_stop: string,
     *         definition: array<string, mixed>,
     *         disk_mib: int,
     *         docker_images: array<string, string>,
     *         features: array<int, string>,
     *         file_denylist: array<int, string>,
     *         file_hidden_list: array<int, string>,
     *         id: int,
     *         install_container: string|null,
     *         install_entrypoint: string|null,
     *         install_script: string|null,
     *         memory_mib: int,
     *         name: string,
     *         slug: string,
     *         source_type: string,
     *         startup_command: string,
     *         variables: array<int, array<string, mixed>>
     *     },
     *     created_at: string,
     *     id: int,
     *     limits: array{cpu_limit: int, disk_mib: int, memory_mib: int},
     *     name: string,
     *     node_id: int,
     *     status: string,
     *     updated_at: string,
     *     user: array{email: string, id: int, name: string},
     *     volume_path: string
     * }
     */
    public function payload(Server $server): array
    {
        $server->loadMissing(['cargo', 'node', 'user']);

        return [
            'cargo' => [
                'config_files' => $server->cargo->config_files,
                'config_logs' => $server->cargo->config_logs,
                'config_startup' => $server->cargo->config_startup,
                'config_stop' => $server->cargo->config_stop,
                'definition' => $server->cargo->definition,
                'disk_mib' => $server->disk_mib,
                'docker_images' => $server->cargo->docker_images ?? [],
                'features' => $server->cargo->features ?? [],
                'file_denylist' => $server->cargo->file_denylist ?? [],
                'file_hidden_list' => $server->cargo->file_hidden_list ?? [],
                'id' => $server->cargo->id,
                'install_container' => $server->cargo->install_container,
                'install_entrypoint' => $server->cargo->install_entrypoint,
                'install_script' => $server->cargo->install_script,
                'memory_mib' => $server->memory_mib,
                'name' => $server->cargo->name,
                'slug' => $server->cargo->slug,
                'source_type' => $server->cargo->source_type,
                'startup_command' => $server->cargo->startup_command,
                'variables' => $server->cargo->variables ?? [],
            ],
            'created_at' => $server->created_at?->toIso8601String() ?? now()->toIso8601String(),
            'id' => $server->id,
            'limits' => [
                'cpu_limit' => $server->cpu_limit,
                'disk_mib' => $server->disk_mib,
                'memory_mib' => $server->memory_mib,
            ],
            'name' => $server->name,
            'node_id' => $server->node_id,
            'status' => $server->status,
            'updated_at' => $server->updated_at?->toIso8601String() ?? now()->toIso8601String(),
            'user' => [
                'email' => $server->user->email,
                'id' => $server->user->id,
                'name' => $server->user->name,
            ],
            'volume_path' => sprintf('volumes/%d', $server->id),
        ];
    }
}
