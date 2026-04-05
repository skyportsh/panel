<?php

use App\Http\Controllers\Auth\PasskeyAuthenticationController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::get('/', function () {
    if (Auth::check()) {
        return inertia('dashboard');
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
    Route::inertia('home', 'dashboard')->name('home');
});

require __DIR__.'/settings.php';
require __DIR__.'/admin.php';
