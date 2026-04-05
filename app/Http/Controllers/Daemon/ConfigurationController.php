<?php

namespace App\Http\Controllers\Daemon;

use App\Http\Controllers\Controller;
use App\Http\Requests\Daemon\ConfigureDaemonRequest;
use App\Services\NodeConfigurationService;
use Illuminate\Http\JsonResponse;
use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Response;

class ConfigurationController extends Controller
{
    public function __construct(private NodeConfigurationService $nodeConfigurationService) {}

    public function store(ConfigureDaemonRequest $request): JsonResponse
    {
        try {
            $payload = $this->nodeConfigurationService->enroll($request->validated());
        } catch (InvalidArgumentException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return response()->json($payload, Response::HTTP_CREATED);
    }
}
