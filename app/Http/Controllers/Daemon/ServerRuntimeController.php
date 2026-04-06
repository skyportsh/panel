<?php

namespace App\Http\Controllers\Daemon;

use App\Http\Controllers\Controller;
use App\Http\Requests\Daemon\UpdateServerRuntimeRequest;
use App\Models\Server;
use App\Services\ServerRuntimeUpdateService;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class ServerRuntimeController extends Controller
{
    public function __construct(private ServerRuntimeUpdateService $serverRuntimeUpdateService) {}

    public function store(UpdateServerRuntimeRequest $request, Server $server): JsonResponse
    {
        $daemonSecret = $request->bearerToken();

        if (! $daemonSecret) {
            return response()->json([
                'message' => 'Missing daemon secret.',
            ], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $server = $this->serverRuntimeUpdateService->record($daemonSecret, $server, $request->validated());
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'ok' => true,
            'server' => [
                'id' => $server->id,
                'last_error' => $server->last_error,
                'status' => $server->status,
            ],
        ]);
    }
}
