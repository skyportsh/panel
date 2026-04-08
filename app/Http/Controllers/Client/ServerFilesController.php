<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Client\Concerns\AuthorizesServerAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\Client\DestroyServerFilesRequest;
use App\Http\Requests\Client\ShowServerFileContentsRequest;
use App\Http\Requests\Client\StoreServerDirectoryRequest;
use App\Http\Requests\Client\StoreServerFileRequest;
use App\Http\Requests\Client\UpdateServerFileContentsRequest;
use App\Models\Server;
use App\Services\ServerFilesystemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class ServerFilesController extends Controller
{
    use AuthorizesServerAccess;

    public function __construct(
        private ServerFilesystemService $serverFilesystemService,
    ) {}

    public function show(Request $request, Server $server): Response
    {
        $this->authorizeServerAccess($request, $server);

        $server->loadMissing(['cargo', 'node']);
        $path = trim((string) $request->query('path', ''), '/');
        $directory = null;
        $error = null;

        try {
            $directory = $this->serverFilesystemService->listDirectory(
                $server,
                $path,
            );
        } catch (InvalidArgumentException $exception) {
            $error = $exception->getMessage();
        }

        return Inertia::render('server/files', [
            'directory' => $directory,
            'directoryError' => $error,
            'server' => [
                'cargo' => [
                    'id' => $server->cargo->id,
                    'name' => $server->cargo->name,
                ],
                'id' => $server->id,
                'name' => $server->name,
                'node' => [
                    'id' => $server->node->id,
                    'name' => $server->node->name,
                ],
                'status' => $server->status,
            ],
        ]);
    }

    public function contents(
        ShowServerFileContentsRequest $request,
        Server $server,
    ): JsonResponse {
        $this->authorizeServerAccess($request, $server);

        try {
            return response()->json(
                $this->serverFilesystemService->readFile(
                    $server,
                    $request->validated('path'),
                ),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                HttpResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }
    }

    public function storeFile(
        StoreServerFileRequest $request,
        Server $server,
    ): JsonResponse {
        $this->authorizeServerAccess($request, $server);

        try {
            return response()->json(
                $this->serverFilesystemService->createFile(
                    $server,
                    (string) $request->validated('path', ''),
                    $request->validated('name'),
                ),
                HttpResponse::HTTP_CREATED,
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                HttpResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }
    }

    public function storeDirectory(
        StoreServerDirectoryRequest $request,
        Server $server,
    ): JsonResponse {
        $this->authorizeServerAccess($request, $server);

        try {
            return response()->json(
                $this->serverFilesystemService->createDirectory(
                    $server,
                    (string) $request->validated('path', ''),
                    $request->validated('name'),
                ),
                HttpResponse::HTTP_CREATED,
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                HttpResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }
    }

    public function updateContents(
        UpdateServerFileContentsRequest $request,
        Server $server,
    ): JsonResponse {
        $this->authorizeServerAccess($request, $server);

        try {
            return response()->json(
                $this->serverFilesystemService->writeFile(
                    $server,
                    $request->validated('path'),
                    $request->validated('contents'),
                ),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                HttpResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }
    }

    public function destroy(
        DestroyServerFilesRequest $request,
        Server $server,
    ): JsonResponse {
        $this->authorizeServerAccess($request, $server);

        try {
            return response()->json(
                $this->serverFilesystemService->deleteFiles(
                    $server,
                    $request->validated('paths'),
                ),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                HttpResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }
    }
}
