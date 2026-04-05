<?php

use App\Http\Controllers\Admin\LocationsController;
use App\Http\Controllers\Admin\NodesController;
use App\Http\Controllers\Admin\UsersController;
use App\Http\Middleware\EnsureUserIsAdmin;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', EnsureUserIsAdmin::class])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('users', [UsersController::class, 'index'])->name('users.index');
        Route::post('users', [UsersController::class, 'store'])->name('users.store');
        Route::patch('users/{user}', [UsersController::class, 'update'])->name('users.update');
        Route::post('users/{user}/suspend', [UsersController::class, 'suspend'])->name('users.suspend');
        Route::post('users/{user}/unsuspend', [UsersController::class, 'unsuspend'])->name('users.unsuspend');
        Route::post('users/{user}/impersonate', [UsersController::class, 'impersonate'])->name('users.impersonate');
        Route::delete('users/bulk-destroy', [UsersController::class, 'bulkDestroy'])->name('users.bulk-destroy');
        Route::delete('users/{user}', [UsersController::class, 'destroy'])->name('users.destroy');

        Route::get('locations', [LocationsController::class, 'index'])->name('locations.index');
        Route::post('locations', [LocationsController::class, 'store'])->name('locations.store');
        Route::patch('locations/{location}', [LocationsController::class, 'update'])->name('locations.update');
        Route::delete('locations/bulk-destroy', [LocationsController::class, 'bulkDestroy'])->name('locations.bulk-destroy');
        Route::delete('locations/{location}', [LocationsController::class, 'destroy'])->name('locations.destroy');

        Route::get('nodes', [NodesController::class, 'index'])->name('nodes.index');
        Route::post('nodes', [NodesController::class, 'store'])->name('nodes.store');
        Route::post('nodes/{node}/configure-token', [NodesController::class, 'generateConfigurationToken'])->name('nodes.configure-token');
        Route::patch('nodes/{node}', [NodesController::class, 'update'])->name('nodes.update');
        Route::delete('nodes/bulk-destroy', [NodesController::class, 'bulkDestroy'])->name('nodes.bulk-destroy');
        Route::delete('nodes/{node}', [NodesController::class, 'destroy'])->name('nodes.destroy');
    });

Route::post('admin/stop-impersonating', [UsersController::class, 'stopImpersonating'])
    ->name('admin.stop-impersonating')
    ->middleware(['auth']);
