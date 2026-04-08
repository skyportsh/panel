<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Client\Concerns\AuthorizesServerAccess;
use App\Http\Controllers\Controller;
use App\Http\Requests\Client\ArchiveServerFilesRequest;
use App\Http\Requests\Client\CopyServerFilesRequest;
use App\Http\Requests\Client\DestroyServerFilesRequest;
use App\Http\Requests\Client\ExtractServerArchiveRequest;
use App\Http\Requests\Client\MoveServerFilesRequest;
use App\Http\Requests\Client\RenameServerFileRequest;
use App\Http\Requests\Client\ShowServerFileContentsRequest;
use App\Http\Requests\Client\StoreServerDirectoryRequest;
use App\Http\Requests\Client\StoreServerFileRequest;
use App\Http\Requests\Client\UpdateServerFileContentsRequest;
use App\Http\Requests\Client\UpdateServerFilePermissionsRequest;
use App\Http\Requests\Client\UploadServerFileRequest;
use App\Models\Server;
use App\Services\ServerFilesystemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
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

    public function rename(
        RenameServerFileRequest $request,
        Server $server,
    ): JsonResponse {
        $this->authorizeServerAccess($request, $server);

        try {
            return response()->json(
                $this->serverFilesystemService->renameFile(
                    $server,
                    $request->validated('path'),
                    $request->validated('name'),
                ),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                HttpResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }
    }

    public function move(
        MoveServerFilesRequest $request,
        Server $server,
    ): JsonResponse {
        $this->authorizeServerAccess($request, $server);

        try {
            return response()->json(
                $this->serverFilesystemService->moveFiles(
                    $server,
                    $request->validated('paths'),
                    $request->validated('destination'),
                ),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                HttpResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }
    }

    public function copy(
        CopyServerFilesRequest $request,
        Server $server,
    ): JsonResponse {
        $this->authorizeServerAccess($request, $server);

        try {
            return response()->json(
                $this->serverFilesystemService->copyFiles(
                    $server,
                    $request->validated('paths'),
                    $request->validated('destination'),
                ),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                HttpResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }
    }

    public function updatePermissions(
        UpdateServerFilePermissionsRequest $request,
        Server $server,
    ): JsonResponse {
        $this->authorizeServerAccess($request, $server);

        try {
            return response()->json(
                $this->serverFilesystemService->updatePermissions(
                    $server,
                    $request->validated('paths'),
                    $request->validated('permissions'),
                ),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                HttpResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }
    }

    public function archive(
        ArchiveServerFilesRequest $request,
        Server $server,
    ): JsonResponse {
        $this->authorizeServerAccess($request, $server);

        try {
            return response()->json(
                $this->serverFilesystemService->createArchive(
                    $server,
                    $request->validated('paths'),
                    (string) $request->validated('path', ''),
                    $request->validated('name'),
                ),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                HttpResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }
    }

    public function extract(
        ExtractServerArchiveRequest $request,
        Server $server,
    ): JsonResponse {
        $this->authorizeServerAccess($request, $server);

        try {
            return response()->json(
                $this->serverFilesystemService->extractArchive(
                    $server,
                    $request->validated('path'),
                    (string) $request->validated('destination', ''),
                ),
            );
        } catch (InvalidArgumentException $exception) {
            return response()->json(
                ['message' => $exception->getMessage()],
                HttpResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }
    }

    public function upload(
        UploadServerFileRequest $request,
        Server $server,
    ): JsonResponse {
        $this->authorizeServerAccess($request, $server);

        $file = $request->file('file');

        if (! $file instanceof UploadedFile) {
            return response()->json(
                ['message' => 'Please choose a file to upload.'],
                HttpResponse::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        try {
            return response()->json(
                $this->serverFilesystemService->uploadFile(
                    $server,
                    (string) $request->validated('path', ''),
                    $file,
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
}
