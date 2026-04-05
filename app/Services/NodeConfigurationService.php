<?php

namespace App\Services;

use App\Models\Node;
use App\Models\NodeCredential;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;
use InvalidArgumentException;

class NodeConfigurationService
{
    private const DEFAULT_DAEMON_UUID = '00000000-0000-0000-0000-000000000000';

    public function issue(Node $node): array
    {
        $token = Str::random(64);
        $expiresAt = CarbonImmutable::now()->addHour();

        $credential = $node->credential ?? new NodeCredential(['node_id' => $node->id]);

        $credential->fill([
            'enrollment_token_hash' => $this->hash($token),
            'enrollment_expires_at' => $expiresAt,
            'enrollment_used_at' => null,
            'daemon_secret_hash' => null,
            'daemon_secret_issued_at' => null,
        ]);
        $credential->save();

        $node->forceFill([
            'status' => 'configured',
            'daemon_uuid' => null,
            'daemon_version' => null,
            'enrolled_at' => null,
        ])->save();

        return [
            'expires_at' => $expiresAt,
            'token' => $token,
        ];
    }

    public function enroll(array $payload): array
    {
        $credential = NodeCredential::query()
            ->with('node')
            ->where('enrollment_token_hash', $this->hash($payload['token']))
            ->first();

        if (! $credential || ! $credential->node) {
            throw new InvalidArgumentException('The enrollment token is invalid.');
        }

        if (! $credential->enrollment_expires_at || $credential->enrollment_expires_at->isPast()) {
            throw new InvalidArgumentException('The enrollment token has expired.');
        }

        if ($credential->enrollment_used_at) {
            throw new InvalidArgumentException('The enrollment token has already been used.');
        }

        $issuedAt = CarbonImmutable::now();
        $secret = Str::random(64);
        $node = $credential->node;
        $daemonUuid = $this->resolveDaemonUuid($payload['uuid'], $node);

        $credential->fill([
            'enrollment_used_at' => $issuedAt,
            'daemon_secret_hash' => $this->hash($secret),
            'daemon_secret_issued_at' => $issuedAt,
        ]);
        $credential->save();

        $node->forceFill([
            'status' => 'online',
            'daemon_uuid' => $daemonUuid,
            'daemon_version' => $payload['version'],
            'enrolled_at' => $issuedAt,
        ])->save();

        return [
            'daemon_secret' => $secret,
            'daemon_uuid' => $daemonUuid,
            'heartbeat_interval_seconds' => 30,
            'name' => $node->name,
            'node_id' => $node->id,
            'panel_time' => $issuedAt->toIso8601String(),
            'task_poll_interval_seconds' => 5,
        ];
    }

    private function resolveDaemonUuid(string $requestedUuid, Node $node): string
    {
        if ($requestedUuid !== self::DEFAULT_DAEMON_UUID) {
            return $requestedUuid;
        }

        if ($node->daemon_uuid) {
            return $node->daemon_uuid;
        }

        return (string) Str::uuid();
    }

    private function hash(string $value): string
    {
        return hash('sha256', $value);
    }
}
