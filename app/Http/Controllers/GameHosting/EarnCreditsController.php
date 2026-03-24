<?php

namespace App\Http\Controllers\GameHosting;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class EarnCreditsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('game-hosting/earn-credits');
    }
}
