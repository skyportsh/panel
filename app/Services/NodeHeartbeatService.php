<?php

namespace App\Services;

use App\Models\Node;
use App\Models\NodeCredential;
use Illuminate\Support\Carbon;
use InvalidArgumentException;

class NodeHeartbeatService
{
    public function __construct(
        private NodeConfigurationService $nodeConfigurationService,
        private PanelVersionService $panelVersionService,
    ) {}

    /**
     * @return array{
     *     configuration: array{
     *         daemon_port: int,
     *         fqdn: string,
     *         location_country: string,
     *         location_name: string,
     *         name: string,
     *         sftp_port: int,
     *         updated_at: string,
     *         use_ssl: bool
     *     },
     *     node: Node
     * }
     */
    public function record(string $daemonSecret, array $payload): array
    {
        $credential = NodeCredential::query()
            ->with('node.location')
            ->where('daemon_secret_hash', hash('sha256', $daemonSecret))
            ->first();

        if (! $credential || ! $credential->node) {
            throw new InvalidArgumentException('The daemon secret is invalid.');
        }

        $this->panelVersionService->ensureCompatible($payload['version']);

        $node = $credential->node;

        if ($node->daemon_uuid && $node->daemon_uuid !== $payload['uuid']) {
            throw new InvalidArgumentException(
                'The daemon identity does not match this node.',
            );
        }

        $node
            ->forceFill([
                'status' => 'online',
                'daemon_version' => $payload['version'],
                'last_seen_at' => Carbon::now(),
            ])
            ->save();

        $node = $node->fresh(['location']) ?? $node;

        return [
            'configuration' => $this->nodeConfigurationService->configurationPayload(
                $node,
            ),
            'node' => $node,
        ];
    }
}
