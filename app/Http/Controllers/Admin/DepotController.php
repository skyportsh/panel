<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Cargo;
use App\Services\CargoDefinitionService;
use App\Services\DepotCatalogService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class DepotController extends Controller
{
    public function __construct(
        private CargoDefinitionService $cargoDefinitionService,
        private DepotCatalogService $depotCatalog,
    ) {}

    public function install(string $key): RedirectResponse
    {
        $item = $this->resolve($key);

        $payload = $this->cargoDefinitionService->compile(
            $this->depotCatalog->buildDefinition($item),
        );

        if (Cargo::query()->where('slug', $payload['slug'])->exists()) {
            return Redirect::back()->with(
                'success',
                $item['name'].' is already installed.',
            );
        }

        Cargo::query()->create($payload);

        return Redirect::back()->with(
            'success',
            $item['name'].' installed from depot.',
        );
    }

    public function destroy(string $key): RedirectResponse
    {
        $item = $this->resolve($key);
        $slug = Str::slug((string) $item['name']);

        $cargo = Cargo::query()->where('slug', $slug)->first();

        if ($cargo === null) {
            return Redirect::back()->with(
                'success',
                $item['name'].' is not installed.',
            );
        }

        $serverCount = $cargo->servers()->count();

        if ($serverCount > 0) {
            return Redirect::back()->withErrors([
                'key' => $item['name'].' is used by '.$serverCount.' '.Str::plural('server', $serverCount).'. Remove them first.',
            ]);
        }

        $cargo->delete();

        return Redirect::back()->with(
            'success',
            $item['name'].' removed.',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function resolve(string $key): array
    {
        try {
            return $this->depotCatalog->findOrFail($key);
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'key' => $exception->getMessage(),
            ]);
        }
    }
}
