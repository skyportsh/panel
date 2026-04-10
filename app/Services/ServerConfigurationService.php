<?php

namespace App\Services;

use App\Models\Server;
use InvalidArgumentException;

class ServerConfigurationService
{
    /**
     * @return array{
     *     allocation: array{bind_ip: string, id: int, ip_alias: string|null, port: int},
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
     *     docker_image: string|null,
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
        $server->loadMissing(['allocation', 'cargo', 'firewallRules', 'interconnects', 'node', 'user']);
        $allocation = $server->allocation;

        if (! $allocation) {
            throw new InvalidArgumentException(
                'The server is missing its primary allocation.',
            );
        }

        return [
            'allocation' => [
                'bind_ip' => $allocation->bind_ip,
                'id' => $allocation->id,
                'ip_alias' => $allocation->ip_alias,
                'port' => $allocation->port,
            ],
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
                'startup_command' => $server->startup_command_override ?? $server->cargo->startup_command,
                'variables' => $server->cargo->variables ?? [],
            ],
            'created_at' => $server->created_at?->toIso8601String() ??
                now()->toIso8601String(),
            'docker_image' => $server->docker_image_override ?? $server->docker_image,
            'id' => $server->id,
            'limits' => [
                'cpu_limit' => $server->cpu_limit,
                'disk_mib' => $server->disk_mib,
                'memory_mib' => $server->memory_mib,
            ],
            'name' => $server->name,
            'node_id' => $server->node_id,
            'status' => $server->status,
            'updated_at' => $server->updated_at?->toIso8601String() ??
                now()->toIso8601String(),
            'user' => [
                'email' => $server->user->email,
                'id' => $server->user->id,
                'name' => $server->user->name,
            ],
            'volume_path' => sprintf('volumes/%d', $server->id),
            'interconnects' => $server->interconnects->map(
                fn ($ic): array => [
                    'id' => $ic->id,
                    'name' => $ic->name,
                ],
            )->all(),
            'firewall_rules' => $server->firewallRules->map(
                fn ($rule): array => [
                    'id' => $rule->id,
                    'direction' => $rule->direction,
                    'action' => $rule->action,
                    'protocol' => $rule->protocol,
                    'source' => $rule->source,
                    'port_start' => $rule->port_start,
                    'port_end' => $rule->port_end,
                ],
            )->all(),
        ];
    }
}
