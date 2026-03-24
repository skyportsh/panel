<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\StorePasskeyRequest;
use App\Models\Passkey;
use App\Support\WebAuthn\PasskeyService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class PasskeyController extends Controller
{
    public function __construct(private PasskeyService $passkeyService) {}

    public function create(Request $request): JsonResponse
    {
        return response()->json(
            $this->passkeyService->registrationOptions($request->user(), $request->session(), $request->getHost()),
        );
    }

    public function store(StorePasskeyRequest $request): JsonResponse
    {
        $passkey = $this->passkeyService->register(
            $request->user(),
            $request->session(),
            $request->validated(),
            $request->getSchemeAndHttpHost(),
            $request->getHost(),
        );

        return response()->json([
            'passkey' => [
                'created_at' => $passkey->created_at?->toIso8601String(),
                'id' => $passkey->id,
                'last_used_at' => $passkey->last_used_at?->toIso8601String(),
                'name' => $passkey->name,
            ],
        ], Response::HTTP_CREATED);
    }

    public function destroy(Request $request, Passkey $passkey): Response
    {
        abort_unless($passkey->user()->is($request->user()), Response::HTTP_NOT_FOUND);

        $passkey->delete();

        return response()->noContent();
    }
}
