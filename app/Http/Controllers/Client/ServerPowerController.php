<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Client\Concerns\AuthorizesServerAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\Client\StoreServerPowerRequest;
use App\Models\Server;
use App\Services\ServerPowerService;
use App\Support\ServerPowerState;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class ServerPowerController extends Controller
{
    use AuthorizesServerAccess;

    public function __construct(private ServerPowerService $serverPowerService) {}

    public function store(
        StoreServerPowerRequest $request,
        Server $server,
    ): JsonResponse {
        $this->authorizeServerAccess($request, $server);

        try {
            $server = $this->serverPowerService->dispatch(
                $server,
                $request->validated('signal'),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json([
            'ok' => true,
            'server' => [
                'allowed_actions' => ServerPowerState::mapFor($server->status),
                'id' => $server->id,
                'status' => $server->status,
            ],
        ]);
    }
}
