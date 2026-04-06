<?php

namespace App\Services;

use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use InvalidArgumentException;

class CargoDefinitionService
{
    public const VERSION = 'SPDL_v1';

    /**
     * @param  array{name: string, author: string, description?: string|null, startup?: string|null}  $attributes
     * @return array<string, mixed>
     */
    public function starter(array $attributes): array
    {
        return $this->normalizeDefinition(
            [
                '_comment' => 'Skyport cargo definition file',
                'meta' => [
                    'version' => self::VERSION,
                    'source' => 'skyport',
                    'update_url' => null,
                ],
                'exported_at' => now()->toIso8601String(),
                'name' => $attributes['name'],
                'author' => $attributes['author'],
                'description' => $attributes['description'] ?? '',
                'features' => [],
                'docker_images' => [
                    'Default' => 'ghcr.io/skyportsh/yolks:latest',
                ],
                'file_denylist' => [],
                'file_hidden_list' => [],
                'startup' => $attributes['startup'] ?? './start.sh',
                'config' => [
                    'files' => '{}',
                    'startup' => '{}',
                    'logs' => '{}',
                    'stop' => 'stop',
                ],
                'scripts' => [
                    'installation' => [
                        'script' => "#!/bin/bash\n# Installation script for {$attributes['name']}\ncd /mnt/server\necho \"Add your installation steps here\"",
                        'container' => 'ghcr.io/skyportsh/installers:ubuntu',
                        'entrypoint' => 'bash',
                    ],
                ],
                'variables' => [],
            ],
            'native',
        );
    }

    /**
     * @return array{name: string, slug: string, author: string, cargofile: string, definition: array<string, mixed>, description: string, features: array<int, string>, docker_images: array<string, string>, file_denylist: array<int, string>, file_hidden_list: array<int, string>, startup_command: string, config_files: string, config_startup: string, config_logs: string, config_stop: string, install_script: string, install_container: string, install_entrypoint: string, variables: array<int, array<string, mixed>>, source_type: string}
     */
    public function parseImport(string $content): array
    {
        $decoded = json_decode($content, true);

        if (! is_array($decoded)) {
            throw new InvalidArgumentException(
                'The import file must be valid JSON.',
            );
        }

        $version = (string) Arr::get($decoded, 'meta.version', '');

        if (str_starts_with($version, 'PTDL_')) {
            $definition = $this->normalizeDefinition($decoded, 'pterodactyl');
        } elseif ($version === self::VERSION) {
            $definition = $this->normalizeDefinition($decoded, 'native');
        } else {
            throw new InvalidArgumentException(
                'Unsupported cargo format. Import a .cargofile or a Pterodactyl egg export.',
            );
        }

        return $this->compile($definition);
    }

    /**
     * @return array{name: string, slug: string, author: string, cargofile: string, definition: array<string, mixed>, description: string, features: array<int, string>, docker_images: array<string, string>, file_denylist: array<int, string>, file_hidden_list: array<int, string>, startup_command: string, config_files: string, config_startup: string, config_logs: string, config_stop: string, install_script: string, install_container: string, install_entrypoint: string, variables: array<int, array<string, mixed>>, source_type: string}
     */
    public function parseCargofile(string $content): array
    {
        $decoded = json_decode($content, true);

        if (! is_array($decoded)) {
            throw new InvalidArgumentException(
                'The cargofile must be valid JSON.',
            );
        }

        $definition = $this->normalizeDefinition($decoded, 'native');

        return $this->compile($definition);
    }

    /**
     * @param  array<string, mixed>  $definition
     * @return array{name: string, slug: string, author: string, cargofile: string, definition: array<string, mixed>, description: string, features: array<int, string>, docker_images: array<string, string>, file_denylist: array<int, string>, file_hidden_list: array<int, string>, startup_command: string, config_files: string, config_startup: string, config_logs: string, config_stop: string, install_script: string, install_container: string, install_entrypoint: string, variables: array<int, array<string, mixed>>, source_type: string}
     */
    public function compile(array $definition): array
    {
        $normalized = $this->normalizeDefinition(
            $definition,
            Arr::get($definition, 'meta.source_format') === 'pterodactyl'
                ? 'pterodactyl'
                : 'native',
        );

        return [
            'name' => $normalized['name'],
            'slug' => Str::slug($normalized['name']),
            'author' => $normalized['author'],
            'description' => $normalized['description'],
            'features' => $normalized['features'],
            'docker_images' => $normalized['docker_images'],
            'file_denylist' => $normalized['file_denylist'],
            'file_hidden_list' => $normalized['file_hidden_list'],
            'startup_command' => $normalized['startup'],
            'config_files' => (string) Arr::get(
                $normalized,
                'config.files',
                '{}',
            ),
            'config_startup' => (string) Arr::get(
                $normalized,
                'config.startup',
                '{}',
            ),
            'config_logs' => (string) Arr::get(
                $normalized,
                'config.logs',
                '{}',
            ),
            'config_stop' => (string) Arr::get(
                $normalized,
                'config.stop',
                'stop',
            ),
            'install_script' => (string) Arr::get(
                $normalized,
                'scripts.installation.script',
                '',
            ),
            'install_container' => (string) Arr::get(
                $normalized,
                'scripts.installation.container',
                '',
            ),
            'install_entrypoint' => (string) Arr::get(
                $normalized,
                'scripts.installation.entrypoint',
                '',
            ),
            'variables' => $normalized['variables'],
            'cargofile' => $this->serialize($normalized),
            'definition' => $normalized,
            'source_type' => $normalized['meta']['source_format'] === 'pterodactyl'
                    ? 'pterodactyl'
                    : 'native',
        ];
    }

    /**
     * @param  array<string, mixed>  $definition
     */
    public function serialize(array $definition): string
    {
        return json_encode(
            $definition,
            JSON_PRETTY_PRINT |
                JSON_UNESCAPED_SLASHES |
                JSON_UNESCAPED_UNICODE |
                JSON_THROW_ON_ERROR,
        );
    }

    /**
     * @param  array<string, mixed>  $definition
     * @return array<string, mixed>
     */
    private function normalizeDefinition(
        array $definition,
        string $sourceType,
    ): array {
        $name = trim((string) Arr::get($definition, 'name', ''));
        $author = trim((string) Arr::get($definition, 'author', ''));
        $description = (string) Arr::get($definition, 'description', '');
        $startup = (string) Arr::get($definition, 'startup', '');

        if ($name === '') {
            throw new InvalidArgumentException('Cargo name is required.');
        }

        if ($author === '') {
            throw new InvalidArgumentException('Cargo author is required.');
        }

        if ($startup === '') {
            throw new InvalidArgumentException(
                'Cargo startup command is required.',
            );
        }

        $dockerImages = Arr::get($definition, 'docker_images', []);
        $features = Arr::get($definition, 'features', []);
        $fileDenylist = Arr::get($definition, 'file_denylist', []);
        $fileHiddenList = Arr::get($definition, 'file_hidden_list', []);
        $variables = Arr::get($definition, 'variables', []);

        if (
            ! is_array($dockerImages) ||
            ! is_array($features) ||
            ! is_array($fileDenylist) ||
            ! is_array($fileHiddenList) ||
            ! is_array($variables)
        ) {
            throw new InvalidArgumentException(
                'Cargo docker images, features, file denylist, file hidden list, and variables must be arrays.',
            );
        }

        return [
            '_comment' => 'DO NOT EDIT: FILE GENERATED AUTOMATICALLY BY SKYPORT PANEL - SKYPORT.SH',
            'meta' => [
                'version' => self::VERSION,
                'source' => 'skyport',
                'source_format' => $sourceType,
                'update_url' => Arr::get($definition, 'meta.update_url'),
            ],
            'exported_at' => (string) Arr::get(
                $definition,
                'exported_at',
                now()->toIso8601String(),
            ),
            'name' => $name,
            'author' => $author,
            'description' => $description,
            'features' => array_values(array_map('strval', $features)),
            'docker_images' => collect($dockerImages)
                ->mapWithKeys(
                    fn ($image, $label) => [(string) $label => (string) $image],
                )
                ->all(),
            'file_denylist' => array_values(array_map('strval', $fileDenylist)),
            'file_hidden_list' => array_values(
                array_map('strval', $fileHiddenList),
            ),
            'startup' => $startup,
            'config' => [
                'files' => (string) Arr::get($definition, 'config.files', '{}'),
                'startup' => (string) Arr::get(
                    $definition,
                    'config.startup',
                    '{}',
                ),
                'logs' => (string) Arr::get($definition, 'config.logs', '{}'),
                'stop' => (string) Arr::get($definition, 'config.stop', 'stop'),
            ],
            'scripts' => [
                'installation' => [
                    'script' => (string) Arr::get(
                        $definition,
                        'scripts.installation.script',
                        '',
                    ),
                    'container' => (string) Arr::get(
                        $definition,
                        'scripts.installation.container',
                        '',
                    ),
                    'entrypoint' => (string) Arr::get(
                        $definition,
                        'scripts.installation.entrypoint',
                        '',
                    ),
                ],
            ],
            'variables' => collect($variables)
                ->map(
                    fn ($variable) => [
                        'name' => (string) Arr::get($variable, 'name', ''),
                        'description' => (string) Arr::get(
                            $variable,
                            'description',
                            '',
                        ),
                        'env_variable' => (string) Arr::get(
                            $variable,
                            'env_variable',
                            '',
                        ),
                        'default_value' => (string) Arr::get(
                            $variable,
                            'default_value',
                            '',
                        ),
                        'user_viewable' => (bool) Arr::get(
                            $variable,
                            'user_viewable',
                            false,
                        ),
                        'user_editable' => (bool) Arr::get(
                            $variable,
                            'user_editable',
                            false,
                        ),
                        'rules' => (string) Arr::get(
                            $variable,
                            'rules',
                            'nullable|string',
                        ),
                        'field_type' => (string) Arr::get(
                            $variable,
                            'field_type',
                            'text',
                        ),
                    ],
                )
                ->values()
                ->all(),
        ];
    }
}
