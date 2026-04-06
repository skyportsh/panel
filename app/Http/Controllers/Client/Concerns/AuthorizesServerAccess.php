<?php

namespace App\Http\Controllers\Client\Concerns;

use App\Models\Server;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

trait AuthorizesServerAccess
{
    protected function authorizeServerAccess(
        Request $request,
        Server $server,
    ): void {
        abort_unless(
            $request->user()?->is_admin || $server->user_id === $request->user()?->id,
            Response::HTTP_FORBIDDEN,
        );
    }
}
