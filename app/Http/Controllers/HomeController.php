<?php

namespace App\Http\Controllers;

use App\Models\Server;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $showAll =
            $user?->is_admin && $request->string("scope")->value() === "all";
        $search = $request->string("search")->value();

        if (!Schema::hasTable("servers")) {
            return Inertia::render("dashboard", [
                "filters" => [
                    "scope" => $showAll ? "all" : "mine",
                    "search" => $search,
                ],
                "servers" => $this->emptyServersPaginator($request),
            ]);
        }

        $servers = Server::query()
            ->with(["allocation:id,bind_ip,port,ip_alias", "user:id,name"])
            ->when(
                !$showAll,
                fn($query) => $query->where("user_id", $user?->id),
            )
            ->when($search !== "", function ($query) use ($search, $showAll) {
                $query->where(function ($subQuery) use ($search, $showAll) {
                    $subQuery->where("name", "like", "%{$search}%");

                    if ($showAll) {
                        $subQuery->orWhereHas(
                            "user",
                            fn($userQuery) => $userQuery->where(
                                "name",
                                "like",
                                "%{$search}%",
                            ),
                        );
                    }
                });
            })
            ->orderBy("name")
            ->paginate(10)
            ->through(
                fn(Server $server): array => [
                    "allocation" => [
                        "bind_ip" => $server->allocation->bind_ip,
                        "ip_alias" => $server->allocation->ip_alias,
                        "port" => $server->allocation->port,
                    ],
                    "cpu_limit" => $server->cpu_limit,
                    "id" => $server->id,
                    "memory_mib" => $server->memory_mib,
                    "name" => $server->name,
                    "status" => $server->status,
                    "user" => [
                        "id" => $server->user->id,
                        "name" => $server->user->name,
                    ],
                ],
            )
            ->withQueryString();

        return Inertia::render("dashboard", [
            "filters" => [
                "scope" => $showAll ? "all" : "mine",
                "search" => $search,
            ],
            "servers" => $servers,
        ]);
    }

    protected function emptyServersPaginator(
        Request $request,
    ): LengthAwarePaginator {
        return new LengthAwarePaginator(
            items: [],
            total: 0,
            perPage: 10,
            currentPage: $request->integer("page", 1),
        )->withQueryString();
    }
}
