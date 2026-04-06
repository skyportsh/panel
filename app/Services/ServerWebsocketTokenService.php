<?php

namespace App\Services;

use App\Models\Server;
use Illuminate\Support\Carbon;
use InvalidArgumentException;
use JsonException;

class ServerWebsocketTokenService
{
    /**
     * @return array{expires_at: string, socket: string, token: string}
     */
    public function issue(Server $server): array
    {
        $server->loadMissing('node.credential');

        $callbackToken = $server->node->credential?->daemon_callback_token;
        $daemonUuid = $server->node->daemon_uuid;

        if (! $callbackToken || ! $daemonUuid) {
            throw new InvalidArgumentException('The websocket is not available for this server yet.');
        }

        $expiresAt = Carbon::now()->addMinutes(15);
        $payload = [
            'daemon_uuid' => $daemonUuid,
            'exp' => $expiresAt->timestamp,
            'panel_version' => config('app.version'),
            'server_id' => $server->id,
        ];

        try {
            $payloadHex = bin2hex(json_encode($payload, JSON_THROW_ON_ERROR));
        } catch (JsonException $exception) {
            throw new InvalidArgumentException('Failed to create the websocket token.', previous: $exception);
        }

        $signature = hash_hmac('sha256', $payloadHex, $callbackToken);
        $scheme = $server->node->use_ssl ? 'wss' : 'ws';

        return [
            'expires_at' => $expiresAt->toIso8601String(),
            'socket' => sprintf(
                '%s://%s:%d/api/daemon/servers/%d/ws?uuid=%s&panel_version=%s',
                $scheme,
                $server->node->fqdn,
                $server->node->daemon_port,
                $server->id,
                rawurlencode($daemonUuid),
                rawurlencode((string) config('app.version')),
            ),
            'token' => sprintf('%s.%s', $payloadHex, $signature),
        ];
    }
}
