<?php

use App\Http\Controllers\Auth\PasskeyAuthenticationController;
use App\Http\Controllers\Client\ServerConsoleController;
use App\Http\Controllers\Client\ServerFilesController;
use App\Http\Controllers\Client\ServerPowerController;
use App\Http\Controllers\Client\ServerSettingsController;
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
    Route::get('login/passkeys/options', [
        PasskeyAuthenticationController::class,
        'create',
    ])->name('passkeys.authentication.create');
    Route::post('login/passkeys', [
        PasskeyAuthenticationController::class,
        'store',
    ])
        ->middleware('throttle:passkeys.login')
        ->name('passkeys.authentication.store');
});

Route::middleware(['auth'])->group(function () {
    Route::get('home', [HomeController::class, 'index'])->name('home');
    Route::get('server/{server}/console', [
        ServerConsoleController::class,
        'show',
    ])->name('client.servers.console');
    Route::get('server/{server}/files', [
        ServerFilesController::class,
        'show',
    ])->name('client.servers.files');
    Route::get('server/{server}/settings', [
        ServerSettingsController::class,
        'show',
    ])->name('client.servers.settings');
    Route::patch('server/{server}/settings/general', [
        ServerSettingsController::class,
        'updateGeneral',
    ])->name('client.servers.settings.general.update');
    Route::patch('server/{server}/settings/startup', [
        ServerSettingsController::class,
        'updateStartup',
    ])->name('client.servers.settings.startup.update');
    Route::get('api/client/servers/{server}/files/contents', [
        ServerFilesController::class,
        'contents',
    ])->name('client.servers.files.contents');
    Route::put('api/client/servers/{server}/files/contents', [
        ServerFilesController::class,
        'updateContents',
    ])->name('client.servers.files.contents.update');
    Route::post('api/client/servers/{server}/files', [
        ServerFilesController::class,
        'storeFile',
    ])->name('client.servers.files.store');
    Route::post('api/client/servers/{server}/files/directories', [
        ServerFilesController::class,
        'storeDirectory',
    ])->name('client.servers.files.directories.store');
    Route::delete('api/client/servers/{server}/files', [
        ServerFilesController::class,
        'destroy',
    ])->name('client.servers.files.destroy');
    Route::patch('api/client/servers/{server}/files/rename', [
        ServerFilesController::class,
        'rename',
    ])->name('client.servers.files.rename');
    Route::post('api/client/servers/{server}/files/move', [
        ServerFilesController::class,
        'move',
    ])->name('client.servers.files.move');
    Route::post('api/client/servers/{server}/files/copy', [
        ServerFilesController::class,
        'copy',
    ])->name('client.servers.files.copy');
    Route::patch('api/client/servers/{server}/files/permissions', [
        ServerFilesController::class,
        'updatePermissions',
    ])->name('client.servers.files.permissions.update');
    Route::post('api/client/servers/{server}/files/archive', [
        ServerFilesController::class,
        'archive',
    ])->name('client.servers.files.archive');
    Route::post('api/client/servers/{server}/files/extract', [
        ServerFilesController::class,
        'extract',
    ])->name('client.servers.files.extract');
    Route::post('api/client/servers/{server}/files/upload', [
        ServerFilesController::class,
        'upload',
    ])->name('client.servers.files.upload');
    Route::post('api/client/servers/{server}/power', [
        ServerPowerController::class,
        'store',
    ])->name('client.servers.power');
    Route::get('api/client/servers/{server}/websocket', [
        ServerWebsocketController::class,
        'show',
    ])->name('client.servers.websocket');
});

require __DIR__.'/settings.php';
require __DIR__.'/admin.php';
