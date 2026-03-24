<?php

namespace App\Http\Controllers\GameHosting;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class ServersController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('game-hosting/servers');
    }
}
