<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $search = $request->string('search')->value();
        $type = $request->string('type')->value();

        $emptyResponse = [
            'data' => [],
            'links' => [],
            'current_page' => 1,
            'from' => null,
            'last_page' => 1,
            'per_page' => 20,
            'to' => null,
            'total' => 0,
        ];

        if (! Schema::hasTable('user_activities')) {
            return Inertia::render('admin/activity', [
                'activities' => $emptyResponse,
                'filters' => ['search' => $search, 'type' => $type],
            ]);
        }

        $activities = UserActivity::query()
            ->with('user:id,name,email')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('action', 'like', "%{$search}%")
                        ->orWhere('path', 'like', "%{$search}%")
                        ->orWhere('method', 'like', "%{$search}%")
                        ->orWhereHas(
                            'user',
                            fn ($userQuery) => $userQuery
                                ->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%"),
                        );
                });
            })
            ->when($type !== '', fn ($query) => match ($type) {
                'admin' => $query->where('route_name', 'like', 'admin.%'),
                'auth' => $query->whereIn('route_name', [
                    'login.store', 'logout', 'password.confirm.store',
                    'two-factor.confirm', 'two-factor.disable', 'two-factor.enable',
                    'two-factor.login.store', 'two-factor.regenerate-recovery-codes',
                    'passkeys.store', 'passkeys.destroy',
                ]),
                'account' => $query->whereIn('route_name', [
                    'profile.update', 'profile.destroy', 'user-password.update',
                ]),
                'server' => $query->where('route_name', 'like', 'client.%'),
                default => $query,
            })
            ->latest()
            ->paginate(20)
            ->through(fn (UserActivity $activity): array => [
                'id' => $activity->id,
                'action' => $activity->action,
                'routeName' => $activity->route_name,
                'method' => $activity->method,
                'path' => $activity->path,
                'statusCode' => $activity->status_code,
                'userAgent' => $activity->user_agent,
                'context' => $activity->context ?? [],
                'createdAt' => $activity->created_at?->toIso8601String(),
                'createdAtHuman' => $activity->created_at?->diffForHumans(),
                'user' => $activity->user ? [
                    'id' => $activity->user->id,
                    'name' => $activity->user->name,
                    'email' => $activity->user->email,
                ] : null,
            ])
            ->withQueryString();

        return Inertia::render('admin/activity', [
            'activities' => $activities,
            'filters' => ['search' => $search, 'type' => $type],
        ]);
    }
}
