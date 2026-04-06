<?php

namespace App\Services;

use App\Models\NodeCredential;
use App\Models\Server;
use InvalidArgumentException;

class ServerRuntimeUpdateService
{
    public function __construct(
        private PanelVersionService $panelVersionService,
    ) {}

    public function record(
        string $daemonSecret,
        Server $server,
        array $payload,
    ): Server {
        $credential = NodeCredential::query()
            ->with('node')
            ->where('daemon_secret_hash', hash('sha256', $daemonSecret))
            ->first();

        if (! $credential || ! $credential->node) {
            throw new InvalidArgumentException('The daemon secret is invalid.');
        }

        $this->panelVersionService->ensureCompatible($payload['version']);

        if (
            $credential->node->daemon_uuid &&
            $credential->node->daemon_uuid !== $payload['uuid']
        ) {
            throw new InvalidArgumentException(
                'The daemon identity does not match this node.',
            );
        }

        if ($server->node_id !== $credential->node->id) {
            throw new InvalidArgumentException(
                'The server does not belong to this node.',
            );
        }

        $server
            ->forceFill([
                'last_error' => $payload['last_error'] ?? null,
                'status' => $payload['status'],
            ])
            ->save();

        return $server->fresh() ?? $server;
    }
}
