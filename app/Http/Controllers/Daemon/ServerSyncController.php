<?php

namespace App\Http\Controllers\Daemon;

use App\Http\Controllers\Controller;
use App\Models\NodeCredential;
use App\Models\Server;
use App\Services\PanelVersionService;
use App\Services\ServerConfigurationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerSyncController extends Controller
{
    public function __construct(
        private PanelVersionService $panelVersionService,
        private ServerConfigurationService $serverConfigurationService,
    ) {}

    public function show(Request $request, Server $server): JsonResponse
    {
        $daemonSecret = $request->bearerToken();

        if (! $daemonSecret) {
            return response()->json(
                ['message' => 'Missing daemon secret.'],
                Response::HTTP_UNAUTHORIZED,
            );
        }

        $credential = NodeCredential::query()
            ->with('node')
            ->where('daemon_secret_hash', hash('sha256', $daemonSecret))
            ->first();

        if (! $credential || ! $credential->node) {
            return response()->json(
                ['message' => 'The daemon secret is invalid.'],
                Response::HTTP_UNAUTHORIZED,
            );
        }

        if ($server->node_id !== $credential->node->id) {
            return response()->json(
                ['message' => 'The server does not belong to this node.'],
                Response::HTTP_FORBIDDEN,
            );
        }

        $request->validate([
            'uuid' => ['required', 'uuid'],
            'version' => ['required', 'string', 'max:50'],
        ]);

        $this->panelVersionService->ensureCompatible($request->input('version'));

        return response()->json([
            'server' => $this->serverConfigurationService->payload($server),
        ]);
    }
}
