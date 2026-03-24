<?php

use App\Http\Controllers\Admin\UsersController;
use App\Http\Middleware\EnsureUserIsAdmin;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified', EnsureUserIsAdmin::class])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        Route::get('users', [UsersController::class, 'index'])->name('users.index');
        Route::patch('users/{user}', [UsersController::class, 'update'])->name('users.update');
        Route::post('users/{user}/suspend', [UsersController::class, 'suspend'])->name('users.suspend');
        Route::post('users/{user}/unsuspend', [UsersController::class, 'unsuspend'])->name('users.unsuspend');
        Route::post('users/{user}/verify-email', [UsersController::class, 'verifyEmail'])->name('users.verify-email');
        Route::post('users/{user}/impersonate', [UsersController::class, 'impersonate'])->name('users.impersonate');
    });

// Outside admin middleware — the impersonated user needs to access this
Route::post('admin/stop-impersonating', [UsersController::class, 'stopImpersonating'])
    ->name('admin.stop-impersonating')
    ->middleware(['auth']);
