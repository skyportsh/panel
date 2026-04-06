<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Node;
use App\Models\Server;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $startDate = now()->subDays(29)->startOfDay();

        $recentUserCounts = User::query()
            ->where('created_at', '>=', $startDate)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as total')
            ->groupBy('date')
            ->pluck('total', 'date');

        $recentUsers = collect(range(0, 29))
            ->map(function (int $offset) use (
                $recentUserCounts,
                $startDate,
            ): array {
                $date = $startDate->copy()->addDays($offset);
                $dateKey = $date->toDateString();

                return [
                    'amount' => (int) ($recentUserCounts[$dateKey] ?? 0),
                    'day' => $date->format('M j'),
                ];
            })
            ->all();

        $hasServers = Schema::hasTable('servers');
        $hasNodes = Schema::hasTable('nodes');

        $emptyDays = collect(range(0, 29))
            ->map(fn (int $offset): array => [
                'amount' => 0,
                'day' => $startDate->copy()->addDays($offset)->format('M j'),
            ])
            ->all();

        if ($hasServers) {
            $recentServerCounts = Server::query()
                ->where('created_at', '>=', $startDate)
                ->selectRaw('DATE(created_at) as date, COUNT(*) as total')
                ->groupBy('date')
                ->pluck('total', 'date');

            $recentServers = collect(range(0, 29))
                ->map(function (int $offset) use (
                    $recentServerCounts,
                    $startDate,
                ): array {
                    $date = $startDate->copy()->addDays($offset);
                    $dateKey = $date->toDateString();

                    return [
                        'amount' => (int) ($recentServerCounts[$dateKey] ?? 0),
                        'day' => $date->format('M j'),
                    ];
                })
                ->all();

            $totalServers = Server::query()->count();
            $totalMemoryMib = (int) Server::query()->sum('memory_mib');
            $totalDiskMib = (int) Server::query()->sum('disk_mib');
        } else {
            $recentServers = $emptyDays;
            $totalServers = 0;
            $totalMemoryMib = 0;
            $totalDiskMib = 0;
        }

        $hasAllocations = Schema::hasTable('allocations');

        if ($hasNodes) {
            $nodeQuery = Node::query();

            if ($hasServers && $hasAllocations) {
                $nodeQuery->withCount(['servers', 'allocations']);
            } elseif ($hasServers) {
                $nodeQuery->withCount('servers');
            } elseif ($hasAllocations) {
                $nodeQuery->withCount('allocations');
            }

            $nodes = $nodeQuery
                ->get()
                ->map(fn (Node $node): array => [
                    'name' => $node->name,
                    'fqdn' => $node->fqdn,
                    'status' => $node->status ?? 'unknown',
                    'servers_count' => $hasServers ? $node->servers_count : 0,
                    'allocations_count' => $hasAllocations ? $node->allocations_count : 0,
                    'last_seen_at' => $node->last_seen_at?->diffForHumans(),
                ]);

            $totalNodes = Node::query()->count();
        } else {
            $nodes = collect();
            $totalNodes = 0;
        }

        return Inertia::render('admin/dashboard', [
            'recentUsers' => $recentUsers,
            'recentUsersTotal' => array_sum(
                array_column($recentUsers, 'amount'),
            ),
            'recentServers' => $recentServers,
            'recentServersTotal' => array_sum(
                array_column($recentServers, 'amount'),
            ),
            'nodes' => $nodes,
            'totalServers' => $totalServers,
            'totalNodes' => $totalNodes,
            'totalUsers' => User::query()->count(),
            'totalMemoryMib' => $totalMemoryMib,
            'totalDiskMib' => $totalDiskMib,
            'version' => $this->panelVersion(),
        ]);
    }

    protected function panelVersion(): string
    {
        $hash = rescue(
            fn (): string => trim((string) shell_exec('git rev-parse --short HEAD')),
            'unknown',
            false,
        );

        return "0.0.1-alpha ({$hash})";
    }
}
