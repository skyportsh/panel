<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Client\Concerns\AuthorizesServerAccess;
use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Models\ServerUser;
use App\Services\ServerWebsocketTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class ServerWebsocketController extends Controller
{
    use AuthorizesServerAccess;

    public function __construct(
        private ServerWebsocketTokenService $serverWebsocketTokenService,
    ) {}

    public function show(Request $request, Server $server): JsonResponse
    {
        $this->authorizeServerAccess($request, $server, ServerUser::PERMISSION_CONSOLE);

        $user = $request->user();
        $permissions = [];
        if ($user?->is_admin || $server->user_id === $user?->id) {
            $permissions = ['*'];
        } else {
            $serverUser = ServerUser::query()
                ->where('server_id', $server->id)
                ->where('user_id', $user?->id)
                ->first();
            $permissions = $serverUser?->permissionList() ?? [];
        }

        try {
            $payload = $this->serverWebsocketTokenService->issue($server, $permissions);
        } catch (InvalidArgumentException $exception) {
            return response()->json(
                [
                    'message' => $exception->getMessage(),
                ],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        return response()->json([
            'data' => $payload,
        ]);
    }
}
