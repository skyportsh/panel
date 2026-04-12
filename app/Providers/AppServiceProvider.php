<?php

namespace App\Providers;

use App\Hashing\CompatibleArgon2IdHasher;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Hash::extend('argon2id', function ($app): CompatibleArgon2IdHasher {
            return new CompatibleArgon2IdHasher(
                $app['config']->get('hashing.argon') ?? [],
            );
        });

        $this->configureDefaults();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(app()->isProduction());

        RateLimiter::for('daemon', function (Request $request): Limit {
            return Limit::perMinute(300)->by(
                $request->bearerToken() ?: $request->ip(),
            );
        });

        Password::defaults(
            function (): Password {
                $rule = Password::min(12)
                    ->mixedCase()
                    ->letters()
                    ->numbers()
                    ->symbols();

                return app()->isProduction()
                    ? $rule->uncompromised()
                    : $rule;
            },
        );
    }
}
