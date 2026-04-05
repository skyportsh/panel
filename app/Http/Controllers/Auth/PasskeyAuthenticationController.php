<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\PasskeyAuthenticationOptionsRequest;
use App\Http\Requests\Auth\PasskeyAuthenticationRequest;
use App\Support\WebAuthn\PasskeyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class PasskeyAuthenticationController extends Controller
{
    public function __construct(private PasskeyService $passkeyService) {}

    public function create(PasskeyAuthenticationOptionsRequest $request): JsonResponse
    {
        return response()->json(
            $this->passkeyService->authenticationOptions($request->session(), $request->getHost()),
        );
    }

    public function store(PasskeyAuthenticationRequest $request): JsonResponse
    {
        $this->passkeyService->authenticate(
            Auth::guard(),
            $request->session(),
            $request->validated(),
            $request->getSchemeAndHttpHost(),
            $request->getHost(),
        );

        return response()->json([
            'redirect' => redirect()->intended(route('home', absolute: false))->getTargetUrl(),
        ]);
    }
}
