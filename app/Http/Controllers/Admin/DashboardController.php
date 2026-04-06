<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
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
            ->map(function (int $offset) use ($recentUserCounts, $startDate): array {
                $date = $startDate->copy()->addDays($offset);
                $dateKey = $date->toDateString();

                return [
                    'amount' => (int) ($recentUserCounts[$dateKey] ?? 0),
                    'day' => $date->format('M j'),
                ];
            })
            ->all();

        return Inertia::render('admin/dashboard', [
            'recentUsers' => $recentUsers,
            'recentUsersTotal' => array_sum(array_column($recentUsers, 'amount')),
        ]);
    }
}
