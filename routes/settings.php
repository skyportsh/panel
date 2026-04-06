<?php

use App\Http\Controllers\Settings\ActivityController;
use App\Http\Controllers\Settings\PasskeyController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use App\Http\Controllers\Settings\SessionsController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/activity', [ActivityController::class, 'edit'])->name('activity.edit');
    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])->name('security.edit');
    Route::get('settings/passkeys/options', [PasskeyController::class, 'create'])->name('passkeys.create');
    Route::post('settings/passkeys', [PasskeyController::class, 'store'])->name('passkeys.store');
    Route::delete('settings/passkeys/{passkey}', [PasskeyController::class, 'destroy'])->name('passkeys.destroy');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::get('settings/sessions', [SessionsController::class, 'edit'])->name('sessions.edit');
    Route::delete('settings/sessions/{session}', [SessionsController::class, 'destroy'])->name('sessions.destroy');

    Route::inertia('settings/preferences', 'settings/preferences')->name('preferences.edit');
});
