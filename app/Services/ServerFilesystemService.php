<?php

namespace App\Services;

use App\Models\Server;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use Throwable;

class ServerFilesystemService
{
    /**
     * @return array{entries: array<int, array<string, mixed>>, parent_path: ?string, path: string}
     */
    public function listDirectory(Server $server, string $path = ''): array
    {
        return $this->send(fn () => $this->request($server)->get(
            $this->url($server, '/files'),
            [
                'panel_version' => config('app.version'),
                'path' => $path,
                'uuid' => $server->node->daemon_uuid,
            ],
        ));
    }

    /**
     * @return array{contents: string, last_modified_at: int|null, path: string, permissions: string|null, size_bytes: int}
     */
    public function readFile(Server $server, string $path): array
    {
        return $this->send(fn () => $this->request($server)->get(
            $this->url($server, '/files/contents'),
            [
                'panel_version' => config('app.version'),
                'path' => $path,
                'uuid' => $server->node->daemon_uuid,
            ],
        ));
    }

    public function writeFile(
        Server $server,
        string $path,
        string $contents,
    ): array {
        return $this->send(fn () => $this->request($server)->put(
            $this->url($server, '/files/contents'),
            [
                'contents' => $contents,
                'panel_version' => config('app.version'),
                'path' => $path,
                'uuid' => $server->node->daemon_uuid,
            ],
        ));
    }

    public function createFile(
        Server $server,
        string $path,
        string $name,
    ): array {
        return $this->send(fn () => $this->request($server)->post(
            $this->url($server, '/files'),
            [
                'name' => $name,
                'panel_version' => config('app.version'),
                'path' => $path,
                'uuid' => $server->node->daemon_uuid,
            ],
        ));
    }

    public function createDirectory(
        Server $server,
        string $path,
        string $name,
    ): array {
        return $this->send(fn () => $this->request($server)->post(
            $this->url($server, '/files/directories'),
            [
                'name' => $name,
                'panel_version' => config('app.version'),
                'path' => $path,
                'uuid' => $server->node->daemon_uuid,
            ],
        ));
    }

    public function deleteFiles(Server $server, array $paths): array
    {
        return $this->send(fn () => $this->request($server)->send(
            'DELETE',
            $this->url($server, '/files'),
            [
                'json' => [
                    'panel_version' => config('app.version'),
                    'paths' => $paths,
                    'uuid' => $server->node->daemon_uuid,
                ],
            ],
        ));
    }

    public function renameFile(Server $server, string $path, string $name): array
    {
        return $this->send(fn () => $this->request($server)->patch(
            $this->url($server, '/files/rename'),
            [
                'name' => $name,
                'panel_version' => config('app.version'),
                'path' => $path,
                'uuid' => $server->node->daemon_uuid,
            ],
        ));
    }

    public function moveFiles(Server $server, array $paths, string $destination): array
    {
        return $this->send(fn () => $this->request($server)->post(
            $this->url($server, '/files/move'),
            [
                'destination' => $destination,
                'panel_version' => config('app.version'),
                'paths' => $paths,
                'uuid' => $server->node->daemon_uuid,
            ],
        ));
    }

    public function copyFiles(Server $server, array $paths, string $destination): array
    {
        return $this->send(fn () => $this->request($server)->post(
            $this->url($server, '/files/copy'),
            [
                'destination' => $destination,
                'panel_version' => config('app.version'),
                'paths' => $paths,
                'uuid' => $server->node->daemon_uuid,
            ],
        ));
    }

    public function updatePermissions(
        Server $server,
        array $paths,
        string $permissions,
    ): array {
        return $this->send(fn () => $this->request($server)->patch(
            $this->url($server, '/files/permissions'),
            [
                'panel_version' => config('app.version'),
                'paths' => $paths,
                'permissions' => $permissions,
                'uuid' => $server->node->daemon_uuid,
            ],
        ));
    }

    public function createArchive(
        Server $server,
        array $paths,
        string $path,
        string $name,
    ): array {
        return $this->send(fn () => $this->request($server)->post(
            $this->url($server, '/files/archive'),
            [
                'name' => $name,
                'panel_version' => config('app.version'),
                'path' => $path,
                'paths' => $paths,
                'uuid' => $server->node->daemon_uuid,
            ],
        ));
    }

    public function extractArchive(
        Server $server,
        string $path,
        string $destination,
    ): array {
        return $this->send(fn () => $this->request($server)->post(
            $this->url($server, '/files/extract'),
            [
                'destination' => $destination,
                'panel_version' => config('app.version'),
                'path' => $path,
                'uuid' => $server->node->daemon_uuid,
            ],
        ));
    }

    public function uploadFile(
        Server $server,
        string $path,
        UploadedFile $file,
    ): array {
        $filename = $file->getClientOriginalName() ?: $file->getFilename();

        $server->loadMissing('node.credential');

        $callbackToken = $server->node->credential?->daemon_callback_token;
        $daemonUuid = $server->node->daemon_uuid;

        if (! $callbackToken || ! $daemonUuid) {
            throw new InvalidArgumentException(
                'The filesystem is not available for this server yet.',
            );
        }

        $url = $this->url($server, '/files/upload').'?'.http_build_query([
            'name' => $filename,
            'panel_version' => config('app.version'),
            'path' => $path,
            'uuid' => $daemonUuid,
        ]);

        try {
            $response = Http::timeout(300)
                ->connectTimeout(10)
                ->withToken($callbackToken)
                ->withBody(
                    file_get_contents($file->getRealPath()),
                    $file->getMimeType() ?: 'application/octet-stream',
                )
                ->post($url);

            $response->throw();
        } catch (\Throwable $exception) {
            $message = 'The file could not be uploaded to the server.';

            if (method_exists($exception, 'response') && $exception->response) {
                $message = $exception->response->json('message') ?: $message;
            }

            throw new InvalidArgumentException($message, previous: $exception);
        }

        return $response->json() ?: ['message' => 'File uploaded successfully.', 'ok' => true];
    }

    protected function request(Server $server): PendingRequest
    {
        $server->loadMissing('node.credential');

        $callbackToken = $server->node->credential?->daemon_callback_token;
        $daemonUuid = $server->node->daemon_uuid;

        if (! $callbackToken || ! $daemonUuid) {
            throw new InvalidArgumentException(
                'The filesystem is not available for this server yet.',
            );
        }

        return Http::timeout(60)
            ->connectTimeout(10)
            ->acceptJson()
            ->asJson()
            ->withToken($callbackToken);
    }

    /**
     * @param  callable(): Response  $callback
     * @return array<string, mixed>
     */
    protected function send(callable $callback): array
    {
        try {
            return $this->json($callback());
        } catch (InvalidArgumentException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw new InvalidArgumentException(
                'The daemon could not complete the filesystem request.',
                previous: $exception,
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function json(Response $response): array
    {
        try {
            $response->throw();
        } catch (Throwable $exception) {
            throw new InvalidArgumentException(
                (string) ($response->json('message') ?: 'The daemon could not complete the filesystem request.'),
                previous: $exception,
            );
        }

        return $response->json();
    }

    protected function url(Server $server, string $path): string
    {
        $scheme = $server->node->use_ssl ? 'https' : 'http';

        return sprintf(
            '%s://%s:%d/api/daemon/servers/%d%s',
            $scheme,
            $server->node->fqdn,
            $server->node->daemon_port,
            $server->id,
            $path,
        );
    }
}
