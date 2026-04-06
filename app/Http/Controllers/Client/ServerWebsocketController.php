<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Client\Concerns\AuthorizesServerAccess;
use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Services\ServerWebsocketTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class ServerWebsocketController extends Controller
{
    use AuthorizesServerAccess;

    public function __construct(private ServerWebsocketTokenService $serverWebsocketTokenService) {}

    public function show(Request $request, Server $server): JsonResponse
    {
        $this->authorizeServerAccess($request, $server);

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
