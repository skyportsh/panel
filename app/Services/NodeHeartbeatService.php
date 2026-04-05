<?php

namespace App\Services;

use App\Models\Node;
use App\Models\NodeCredential;
use Illuminate\Support\Carbon;
use InvalidArgumentException;

class NodeHeartbeatService
{
    public function record(string $daemonSecret, array $payload): Node
    {
        $credential = NodeCredential::query()
            ->with('node')
            ->where('daemon_secret_hash', hash('sha256', $daemonSecret))
            ->first();

        if (! $credential || ! $credential->node) {
            throw new InvalidArgumentException('The daemon secret is invalid.');
        }

        $node = $credential->node;

        if ($node->daemon_uuid && $node->daemon_uuid !== $payload['uuid']) {
            throw new InvalidArgumentException('The daemon identity does not match this node.');
        }

        $node->forceFill([
            'status' => 'online',
            'daemon_version' => $payload['version'],
            'last_seen_at' => Carbon::now(),
        ])->save();

        return $node->fresh() ?? $node;
    }
}
