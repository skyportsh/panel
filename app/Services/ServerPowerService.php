<?php

namespace App\Services;

use App\Models\Server;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use Throwable;

class ServerPowerService
{
    public function dispatch(Server $server, string $signal): Server
    {
        $server->loadMissing('node.credential');

        $callbackToken = $server->node->credential?->daemon_callback_token;
        $daemonUuid = $server->node->daemon_uuid;

        if (! $callbackToken || ! $daemonUuid) {
            throw new InvalidArgumentException(
                'Power controls are not available for this server yet.',
            );
        }

        $scheme = $server->node->use_ssl ? 'https' : 'http';
        $url = sprintf(
            '%s://%s:%d/api/daemon/servers/%d/power',
            $scheme,
            $server->node->fqdn,
            $server->node->daemon_port,
            $server->id,
        );

        try {
            $response = Http::timeout(10)
                ->acceptJson()
                ->withToken($callbackToken)
                ->post($url, [
                    'panel_version' => config('app.version'),
                    'signal' => $signal,
                    'uuid' => $daemonUuid,
                ]);
        } catch (Throwable) {
            throw new InvalidArgumentException(
                'Failed to contact the daemon for this server.',
            );
        }

        if (! $response->successful()) {
            $message = $response->json('message');

            throw new InvalidArgumentException(
                is_string($message) && $message !== ''
                    ? $message
                    : 'The daemon rejected the power action.',
            );
        }

        return $server->fresh() ?? $server;
    }
}
