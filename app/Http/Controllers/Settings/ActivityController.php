<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\UserActivity;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityController extends Controller
{
    public function edit(Request $request): Response
    {
        $activities = $request->user()->activities()
            ->latest()
            ->paginate(5)
            ->through(function (UserActivity $activity): array {
                return [
                    'id' => $activity->id,
                    'action' => $activity->action,
                    'routeName' => $activity->route_name,
                    'method' => $activity->method,
                    'path' => $activity->path,
                    'statusCode' => $activity->status_code,
                    'userAgent' => $activity->user_agent,
                    'context' => $activity->context ?? [],
                    'createdAt' => $activity->created_at?->toIso8601String(),
                ];
            })
            ->withQueryString();

        return Inertia::render('settings/activity', [
            'activities' => $activities->items(),
            'links' => $activities->linkCollection()->toArray(),
            'meta' => [
                'currentPage' => $activities->currentPage(),
                'from' => $activities->firstItem(),
                'lastPage' => $activities->lastPage(),
                'perPage' => $activities->perPage(),
                'to' => $activities->lastItem(),
                'total' => $activities->total(),
            ],
        ]);
    }
}
