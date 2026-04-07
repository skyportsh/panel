<?php

use App\Http\Controllers\Auth\PasskeyAuthenticationController;
use App\Http\Controllers\Client\ServerConsoleController;
use App\Http\Controllers\Client\ServerPowerController;
use App\Http\Controllers\Client\ServerWebsocketController;
use App\Http\Controllers\HomeController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (Auth::check()) {
        return to_route('home');
    }

    return to_route('login');
});

Route::middleware('guest')->group(function () {
    Route::get('login/passkeys/options', [PasskeyAuthenticationController::class, 'create'])
        ->name('passkeys.authentication.create');
    Route::post('login/passkeys', [PasskeyAuthenticationController::class, 'store'])
        ->middleware('throttle:passkeys.login')
        ->name('passkeys.authentication.store');
});

Route::middleware(['auth'])->group(function () {
    Route::get('home', [HomeController::class, 'index'])->name('home');
    Route::get('server/{server}/console', [ServerConsoleController::class, 'show'])
        ->name('client.servers.console');
    Route::post('api/client/servers/{server}/power', [ServerPowerController::class, 'store'])
        ->name('client.servers.power');
    Route::get('api/client/servers/{server}/websocket', [ServerWebsocketController::class, 'show'])
        ->name('client.servers.websocket');
});

require __DIR__.'/settings.php';
require __DIR__.'/admin.php';
