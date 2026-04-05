<?php

use App\Http\Controllers\Daemon\ConfigurationController;
use App\Http\Controllers\Daemon\HeartbeatController;
use Illuminate\Support\Facades\Route;

Route::prefix('daemon')
    ->name('daemon.')
    ->group(function () {
        Route::post('enroll', [ConfigurationController::class, 'store'])->name('enroll');
        Route::post('heartbeat', [HeartbeatController::class, 'store'])->name('heartbeat');
    });
