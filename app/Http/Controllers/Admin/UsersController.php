<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class UsersController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::query()
            ->when($request->input('search'), function (
                $query,
                string $search,
            ) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")->orWhere(
                        'email',
                        'like',
                        "%{$search}%",
                    );
                });
            })
            ->when($request->boolean('admin_only'), function ($query) {
                $query->where('is_admin', true);
            })
            ->orderByDesc('updated_at')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('admin/users', [
            'users' => $users,
            'filters' => [
                'search' => $request->input('search', ''),
                'admin_only' => $request->boolean('admin_only'),
            ],
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        User::query()->create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => $request->validated('password'),
            'is_admin' => $request->boolean('is_admin'),
        ]);

        return Redirect::back()->with('success', 'User created.');
    }

    public function update(
        UpdateUserRequest $request,
        User $user,
    ): RedirectResponse {
        $user->update($request->validated());

        return Redirect::back()->with('success', 'User updated.');
    }

    public function suspend(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            return Redirect::back()->withErrors([
                'suspend' => 'You cannot suspend yourself.',
            ]);
        }

        $user->update(['suspended_at' => now()]);

        return Redirect::back()->with('success', "{$user->name} has been suspended.");
    }

    public function unsuspend(User $user): RedirectResponse
    {
        $user->update(['suspended_at' => null]);

        return Redirect::back()->with('success', "{$user->name} has been unsuspended.");
    }

    public function impersonate(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            return Redirect::back()->withErrors([
                'impersonate' => 'You cannot impersonate yourself.',
            ]);
        }

        $request->session()->put('impersonator_id', $request->user()->id);

        Auth::login($user);

        return Redirect::route('home');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            return Redirect::back()->withErrors([
                'delete' => 'You cannot delete yourself.',
            ]);
        }

        $user->delete();

        return Redirect::back()->with('success', "{$user->name} has been deleted.");
    }

    public function bulkDestroy(Request $request): RedirectResponse
    {
        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['required', 'integer', 'exists:users,id'],
        ]);

        $ids = collect($request->input('ids'))->reject(
            fn (int $id) => $id === $request->user()->id,
        );

        User::query()->whereIn('id', $ids)->delete();

        $count = $ids->count();

        return Redirect::back()->with(
            'success',
            "{$count} ".Str::plural('user', $count).' deleted.',
        );
    }

    public function stopImpersonating(Request $request): RedirectResponse
    {
        $adminId = $request->session()->pull('impersonator_id');

        if ($adminId) {
            Auth::loginUsingId($adminId);
        }

        return Redirect::route('admin.users.index');
    }
}
