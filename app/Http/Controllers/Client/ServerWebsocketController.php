<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Services\ServerWebsocketTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class ServerWebsocketController extends Controller
{
    public function __construct(private ServerWebsocketTokenService $serverWebsocketTokenService) {}

    public function show(Request $request, Server $server): JsonResponse
    {
        abort_unless(
            $request->user()?->is_admin || $server->user_id === $request->user()?->id,
            Response::HTTP_FORBIDDEN,
        );

        try {
            $payload = $this->serverWebsocketTokenService->issue($server);
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'data' => $payload,
        ]);
    }
}
