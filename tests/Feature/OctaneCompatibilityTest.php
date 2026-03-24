<?php

use App\Actions\Fortify\CreateNewUser;
use App\Support\WebAuthn\PasskeyService;
use Illuminate\Contracts\Config\Repository as ConfigRepository;
use Illuminate\Contracts\Container\Container;
use Illuminate\Contracts\Session\Session;
use Illuminate\Http\Request;

test('octane sensitive services do not capture request scoped dependencies in constructors', function () {
    collect([
        CreateNewUser::class,
        PasskeyService::class,
    ])->each(function (string $class): void {
        $constructor = (new ReflectionClass($class))->getConstructor();

        if ($constructor === null) {
            expect(true)->toBeTrue();

            return;
        }

        $parameterTypes = collect($constructor->getParameters())
            ->map(fn (ReflectionParameter $parameter): ?string => $parameter->getType()?->getName())
            ->filter()
            ->values()
            ->all();

        expect($parameterTypes)
            ->not->toContain(Request::class)
            ->not->toContain(Session::class)
            ->not->toContain(Container::class)
            ->not->toContain(ConfigRepository::class);
    });
});
