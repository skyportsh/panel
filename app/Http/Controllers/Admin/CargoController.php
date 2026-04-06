<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ImportCargoRequest;
use App\Http\Requests\Admin\StoreCargoRequest;
use App\Http\Requests\Admin\UpdateCargoRequest;
use App\Models\Cargo;
use App\Services\CargoDefinitionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class CargoController extends Controller
{
    public function __construct(
        private CargoDefinitionService $cargoDefinitionService,
    ) {}

    public function index(Request $request): Response
    {
        $cargo = Cargo::query()
            ->when($request->input('search'), function (
                $query,
                string $search,
            ) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('author', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('updated_at')
            ->paginate(10)
            ->through(
                fn (Cargo $cargo): array => [
                    'author' => $cargo->author,
                    'cargofile' => $cargo->cargofile,
                    'created_at' => $cargo->created_at?->toIso8601String(),
                    'definition' => $cargo->definition,
                    'description' => $cargo->description,
                    'docker_images_count' => count(
                        $cargo->definition['docker_images'] ?? [],
                    ),
                    'id' => $cargo->id,
                    'name' => $cargo->name,
                    'slug' => $cargo->slug,
                    'source_type' => $cargo->source_type,
                    'updated_at' => $cargo->updated_at?->toIso8601String(),
                    'variables_count' => count(
                        $cargo->definition['variables'] ?? [],
                    ),
                ],
            )
            ->withQueryString();

        return Inertia::render('admin/cargo', [
            'cargo' => $cargo,
            'filters' => [
                'search' => $request->input('search', ''),
            ],
        ]);
    }

    public function store(StoreCargoRequest $request): RedirectResponse
    {
        $definition = $this->cargoDefinitionService->starter(
            $request->validated(),
        );
        $payload = $this->cargoDefinitionService->compile($definition);

        $this->validateUniqueness($payload);

        Cargo::query()->create($payload);

        return Redirect::back()->with('success', 'Cargo created.');
    }

    public function importCargo(ImportCargoRequest $request): RedirectResponse
    {
        try {
            $payload = $this->cargoDefinitionService->parseImport(
                $request->validated('content'),
            );
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'content' => $exception->getMessage(),
            ]);
        }

        $this->validateUniqueness($payload);

        Cargo::query()->create($payload);

        return Redirect::back()->with('success', 'Cargo imported.');
    }

    public function update(
        UpdateCargoRequest $request,
        Cargo $cargo,
    ): RedirectResponse {
        try {
            $payload = $this->cargoDefinitionService->parseCargofile(
                $request->validated('cargofile'),
            );
        } catch (InvalidArgumentException $exception) {
            throw ValidationException::withMessages([
                'cargofile' => $exception->getMessage(),
            ]);
        }

        $this->validateUniqueness($payload, $cargo);

        $cargo->update($payload);

        return Redirect::back()->with('success', 'Cargo updated.');
    }

    public function destroy(Cargo $cargo): RedirectResponse
    {
        $cargo->delete();

        return Redirect::back()->with('success', 'Cargo deleted.');
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'exists:cargos,id'],
        ]);

        $ids = $validated['ids'];
        $count = count($ids);

        Cargo::query()->whereIn('id', $ids)->delete();

        return Redirect::back()->with(
            'success',
            $count.' '.Str::plural('cargo', $count).' deleted.',
        );
    }

    /**
     * @param  array{name: string, slug: string}  $payload
     */
    private function validateUniqueness(
        array $payload,
        ?Cargo $cargo = null,
    ): void {
        Validator::make(
            $payload,
            [
                'name' => [
                    'required',
                    Rule::unique('cargos', 'name')->ignore($cargo?->id),
                ],
                'slug' => [
                    'required',
                    Rule::unique('cargos', 'slug')->ignore($cargo?->id),
                ],
            ],
            [
                'name.unique' => 'That cargo name is already in use.',
                'slug.unique' => 'A cargo with that slug already exists.',
            ],
        )->validate();
    }
}
