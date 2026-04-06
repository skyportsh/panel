<?php

namespace App\Services;

use App\Models\Server;
use Illuminate\Support\Facades\Http;
use Throwable;

class ServerRemoteUpdateService
{
    public function __construct(private ServerConfigurationService $serverConfigurationService) {}

    public function push(Server $targetServer, ?Server $configurationServer = null): bool
    {
        $targetServer->loadMissing('node.credential');
        $configurationServer ??= $targetServer;
        $configurationServer->loadMissing(['allocation', 'cargo', 'node', 'user']);

        $callbackToken = $targetServer->node->credential?->daemon_callback_token;
        $daemonUuid = $targetServer->node->daemon_uuid;

        if (! $callbackToken || ! $daemonUuid) {
            return false;
        }

        $scheme = $targetServer->node->use_ssl ? 'https' : 'http';
        $url = sprintf(
            '%s://%s:%d/api/daemon/servers/sync',
            $scheme,
            $targetServer->node->fqdn,
            $targetServer->node->daemon_port,
        );

        try {
            $response = Http::timeout(5)
                ->acceptJson()
                ->withToken($callbackToken)
                ->post($url, [
                    'panel_version' => config('app.version'),
                    'server' => $this->serverConfigurationService->payload($configurationServer),
                    'uuid' => $daemonUuid,
                ]);

            return $response->successful();
        } catch (Throwable) {
            return false;
        }
    }

    public function delete(Server $server): bool
    {
        $server->loadMissing('node.credential');

        $callbackToken = $server->node->credential?->daemon_callback_token;
        $daemonUuid = $server->node->daemon_uuid;

        if (! $callbackToken || ! $daemonUuid) {
            return false;
        }

        $scheme = $server->node->use_ssl ? 'https' : 'http';
        $url = sprintf(
            '%s://%s:%d/api/daemon/servers/%d',
            $scheme,
            $server->node->fqdn,
            $server->node->daemon_port,
            $server->id,
        );

        try {
            $response = Http::timeout(5)
                ->acceptJson()
                ->withToken($callbackToken)
                ->send('DELETE', $url, [
                    'json' => [
                        'panel_version' => config('app.version'),
                        'uuid' => $daemonUuid,
                    ],
                ]);

            return $response->successful();
        } catch (Throwable) {
            return false;
        }
    }
}
