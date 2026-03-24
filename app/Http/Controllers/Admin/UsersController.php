<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class UsersController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::query()
            ->when($request->input('search'), function ($query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/users', [
            'users' => $users,
            'filters' => [
                'search' => $request->input('search', ''),
            ],
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $validated = $request->validated();

        if (array_key_exists('preferred_currency', $validated)) {
            $validated['preferred_currency_overridden'] = true;
        }

        $user->update($validated);

        return back()->with('success', 'User updated.');
    }

    public function suspend(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            return back()->withErrors(['suspend' => 'You cannot suspend yourself.']);
        }

        $user->update(['suspended_at' => now()]);

        return back()->with('success', "{$user->name} has been suspended.");
    }

    public function unsuspend(User $user): RedirectResponse
    {
        $user->update(['suspended_at' => null]);

        return back()->with('success', "{$user->name} has been unsuspended.");
    }

    public function verifyEmail(User $user): RedirectResponse
    {
        $user->forceFill(['email_verified_at' => now()])->save();

        return back()->with('success', "{$user->name}'s email has been verified.");
    }

    public function impersonate(Request $request, User $user): RedirectResponse
    {
        if ($user->is($request->user())) {
            return back()->withErrors(['impersonate' => 'You cannot impersonate yourself.']);
        }

        $request->session()->put('impersonator_id', $request->user()->id);

        Auth::login($user);

        return redirect()->route('home');
    }

    public function stopImpersonating(Request $request): RedirectResponse
    {
        $adminId = $request->session()->pull('impersonator_id');

        if ($adminId) {
            Auth::loginUsingId($adminId);
        }

        return redirect()->route('admin.users.index');
    }
}
