<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Client\Concerns\AuthorizesServerAccess;
use App\Http\Controllers\Controller;
use App\Models\Server;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ServerFilesystemController extends Controller
{
    use AuthorizesServerAccess;

    public function show(Request $request, Server $server): Response
    {
        $this->authorizeServerAccess($request, $server);

        $server->loadMissing(['allocation', 'cargo']);

        return Inertia::render('server/filesystem', [
            'server' => [
                'allocation' => [
                    'bind_ip' => $server->allocation->bind_ip,
                    'ip_alias' => $server->allocation->ip_alias,
                    'port' => $server->allocation->port,
                ],
                'cargo' => [
                    'id' => $server->cargo->id,
                    'name' => $server->cargo->name,
                ],
                'id' => $server->id,
                'name' => $server->name,
                'status' => $server->status,
            ],
        ]);
    }
}
