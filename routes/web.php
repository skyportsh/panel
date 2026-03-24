<?php

use App\Http\Controllers\Auth\PasskeyAuthenticationController;
use App\Http\Controllers\GameHosting\DomainsController;
use App\Http\Controllers\GameHosting\EarnCreditsController;
use App\Http\Controllers\GameHosting\ResourcesController;
use App\Http\Controllers\GameHosting\ServersController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('welcome');

Route::middleware('guest')->group(function () {
    Route::get('login/passkeys/options', [PasskeyAuthenticationController::class, 'create'])
        ->name('passkeys.authentication.create');
    Route::post('login/passkeys', [PasskeyAuthenticationController::class, 'store'])
        ->middleware('throttle:passkeys.login')
        ->name('passkeys.authentication.store');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('home', 'dashboard')->name('home');
    Route::prefix('compute')->name('compute.')->group(function () {
        Route::inertia('settings', 'compute/settings')->name('settings');
        Route::inertia('virtual-servers', 'compute/virtual-servers')->name('virtual-servers');
    });

    Route::prefix('game-hosting')->name('game-hosting.')->group(function () {
        Route::get('servers', [ServersController::class, 'index'])->name('servers');
        Route::get('domains', [DomainsController::class, 'index'])->name('domains');
        Route::get('resources', [ResourcesController::class, 'index'])->name('resources');
        Route::get('earn-credits', [EarnCreditsController::class, 'index'])->name('earn-credits');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/admin.php';
