<?php

namespace App\Services;

use App\Models\Node;
use Illuminate\Support\Facades\Http;
use Throwable;

class NodeRemoteUpdateService
{
    public function __construct(
        private NodeConfigurationService $nodeConfigurationService,
    ) {}

    public function push(Node $targetNode, Node $configurationNode): bool
    {
        $targetNode->loadMissing('credential');
        $configurationNode->loadMissing('location');

        $callbackToken = $targetNode->credential?->daemon_callback_token;

        if (! $callbackToken || ! $targetNode->daemon_uuid) {
            return false;
        }

        $scheme = $targetNode->use_ssl ? 'https' : 'http';
        $url = sprintf(
            '%s://%s:%d/api/daemon/configuration/sync',
            $scheme,
            $targetNode->fqdn,
            $targetNode->daemon_port,
        );

        try {
            $response = Http::timeout(5)
                ->acceptJson()
                ->withToken($callbackToken)
                ->post($url, [
                    ...$this->nodeConfigurationService->configurationPayload(
                        $configurationNode,
                    ),
                    'panel_version' => config('app.version'),
                    'uuid' => $targetNode->daemon_uuid,
                ]);

            return $response->successful();
        } catch (Throwable) {
            return false;
        }
    }
}
