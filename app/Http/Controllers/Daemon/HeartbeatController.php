<?php

namespace App\Http\Controllers\Daemon;

use App\Http\Controllers\Controller;
use App\Http\Requests\Daemon\HeartbeatDaemonRequest;
use App\Services\NodeHeartbeatService;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class HeartbeatController extends Controller
{
    public function __construct(private NodeHeartbeatService $nodeHeartbeatService) {}

    public function store(HeartbeatDaemonRequest $request): JsonResponse
    {
        $daemonSecret = $request->bearerToken();

        if (! $daemonSecret) {
            return response()->json([
                'message' => 'Missing daemon secret.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $node = $this->nodeHeartbeatService->record($daemonSecret, $request->validated());
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'ok' => true,
            'last_seen_at' => $node->last_seen_at?->toIso8601String(),
        ]);
    }
}
