<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class SessionsController extends Controller
{
    public function edit(Request $request): Response
    {
        $currentSessionId = $request->session()->getId();

        $sessions = DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('last_activity')
            ->get()
            ->map(fn (object $session): array => [
                'id' => $session->id,
                'ip_address' => $session->ip_address,
                'user_agent' => $session->user_agent,
                'last_activity' => now()->subSeconds(time() - $session->last_activity)->diffForHumans(),
                'is_current' => $session->id === $currentSessionId,
            ]);

        return Inertia::render('settings/sessions', [
            'sessions' => $sessions,
        ]);
    }

    public function destroy(Request $request, string $sessionId): RedirectResponse
    {
        $currentSessionId = $request->session()->getId();

        if ($sessionId === $currentSessionId) {
            return Redirect::back()->withErrors([
                'session' => 'You cannot revoke your current session.',
            ]);
        }

        DB::table('sessions')
            ->where('id', $sessionId)
            ->where('user_id', $request->user()->id)
            ->delete();

        return Redirect::back()->with('success', 'Session revoked.');
    }
}
