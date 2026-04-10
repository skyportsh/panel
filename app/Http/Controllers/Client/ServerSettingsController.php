<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Client\Concerns\AuthorizesServerAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\Client\UpdateServerGeneralRequest;
use App\Http\Requests\Client\UpdateServerStartupRequest;
use App\Models\Server;
use App\Services\ServerRemoteUpdateService;
use App\Support\CargoRuntimeImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ServerSettingsController extends Controller
{
    use AuthorizesServerAccess;

    public function __construct(
        private ServerRemoteUpdateService $serverRemoteUpdateService,
    ) {}

    public function show(Request $request, Server $server): Response
    {
        $this->authorizeServerAccess($request, $server);

        $server->loadMissing(['cargo', 'node']);
        $effectiveDockerImage = CargoRuntimeImage::resolve(
            $server->cargo->docker_images,
            $server->docker_image,
        );

        return Inertia::render('server/settings', [
            'server' => [
                'cargo' => [
                    'docker_images' => collect($server->cargo->docker_images ?? [])
                        ->map(
                            fn (string $image, string $label): array => [
                                'image' => $image,
                                'label' => $label,
                            ],
                        )
                        ->values()
                        ->all(),
                    'id' => $server->cargo->id,
                    'name' => $server->cargo->name,
                ],
                'docker_image' => $server->docker_image,
                'startup_command' => $server->startup_command_override ?? $server->cargo->startup_command,
                'startup_command_override' => $server->startup_command_override,
                'docker_image_override' => $server->docker_image_override,
                'effective_docker_image' => $effectiveDockerImage,
                'effective_docker_image_label' => CargoRuntimeImage::labelFor(
                    $server->cargo->docker_images,
                    $server->docker_image,
                ),
                'id' => $server->id,
                'name' => $server->name,
                'node' => [
                    'id' => $server->node->id,
                    'name' => $server->node->name,
                    'online' => $server->node->isOnline(),
                ],
                'status' => $server->status,
            ],
        ]);
    }

    public function updateGeneral(
        UpdateServerGeneralRequest $request,
        Server $server,
    ): RedirectResponse {
        $this->authorizeServerAccess($request, $server);

        $server->loadMissing(['allocation', 'cargo', 'node.credential', 'user']);
        $targetServer = clone $server;
        $server->update([
            'name' => $request->validated('name'),
        ]);
        $server->refresh()->loadMissing([
            'allocation',
            'cargo',
            'node.credential',
            'user',
        ]);

        return $this->syncServerUpdate(
            $targetServer,
            $server,
            'Server settings updated. skyportd saved the new server state.',
            'skyportd could not be updated automatically. This server will need to be synced later.',
        );
    }

    public function updateStartup(
        UpdateServerStartupRequest $request,
        Server $server,
    ): RedirectResponse {
        $this->authorizeServerAccess($request, $server);

        $server->loadMissing(['allocation', 'cargo', 'node.credential', 'user']);
        $targetServer = clone $server;
        $server->update([
            'docker_image' => $request->validated('docker_image'),
        ]);
        $server->refresh()->loadMissing([
            'allocation',
            'cargo',
            'node.credential',
            'user',
        ]);

        $successMessage = in_array(
            $server->status,
            ['offline', 'install_failed', 'pending'],
            true,
        )
            ? 'Startup settings updated. The new Docker image is queued for the next restart.'
            : 'Startup settings updated. Restart the server to rebuild it with the new Docker image.';

        return $this->syncServerUpdate(
            $targetServer,
            $server,
            $successMessage,
            'skyportd could not be updated automatically. The new Docker image will be applied once this server can be synced again.',
        );
    }

    private function syncServerUpdate(
        Server $targetServer,
        Server $server,
        string $successMessage,
        string $warningMessage,
    ): RedirectResponse {
        if ($this->serverRemoteUpdateService->push($targetServer, $server)) {
            return Redirect::back()->with('success', $successMessage);
        }

        return Redirect::back()
            ->with('success', 'Settings updated.')
            ->with('warning', $warningMessage);
    }
}
