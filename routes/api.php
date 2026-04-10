<?php

use App\Http\Controllers\Daemon\ConfigurationController;
use App\Http\Controllers\Daemon\HeartbeatController;
use App\Http\Controllers\Daemon\ServerRuntimeController;
use App\Http\Controllers\Daemon\ServerSyncController;
use App\Http\Controllers\Daemon\SftpAuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('daemon')
    ->name('daemon.')
    ->middleware('throttle:daemon')
    ->group(function () {
        Route::post('enroll', [ConfigurationController::class, 'store'])->name(
            'enroll',
        );
        Route::post('heartbeat', [HeartbeatController::class, 'store'])->name(
            'heartbeat',
        );
        Route::post('servers/{server}/runtime', [
            ServerRuntimeController::class,
            'store',
        ])->name('servers.runtime');
        Route::get('servers/{server}/sync', [
            ServerSyncController::class,
            'show',
        ])->name('servers.sync');
        Route::post('sftp/auth', [
            SftpAuthController::class,
            'store',
        ])->name('sftp.auth');
    });
