<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Client\Concerns\AuthorizesServerAccess;
use App\Http\Controllers\Controller;
use App\Models\Server;
use App\Support\ServerPowerState;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ServerConsoleController extends Controller
{
    use AuthorizesServerAccess;

    public function show(Request $request, Server $server): Response
    {
        $this->authorizeServerAccess($request, $server);

        $server->loadMissing(['allocation', 'cargo', 'node']);

        return Inertia::render('server/console', [
            'server' => [
                'allocation' => [
                    'bind_ip' => $server->allocation->bind_ip,
                    'ip_alias' => $server->allocation->ip_alias,
                    'port' => $server->allocation->port,
                ],
                'allowed_actions' => ServerPowerState::mapFor($server->status),
                'cargo' => [
                    'id' => $server->cargo->id,
                    'name' => $server->cargo->name,
                ],
                'id' => $server->id,
                'last_error' => $server->last_error,
                'name' => $server->name,
                'node' => [
                    'id' => $server->node->id,
                    'name' => $server->node->name,
                ],
                'status' => $server->status,
            ],
        ]);
    }
}
