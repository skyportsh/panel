<?php

use App\Http\Middleware\RecordUserActivity;
use App\Models\User;
use App\Models\UserActivity;
use Inertia\Testing\AssertableInertia as Assert;

test('activity page is displayed with paginated results', function () {
    $this->withoutMiddleware(RecordUserActivity::class);

    $user = User::factory()->create();

    UserActivity::factory()->count(13)->for($user)->create();

    $this->actingAs($user)
        ->get(route('activity.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/activity')
            ->has('activities', 5)
            ->where('meta.currentPage', 1)
            ->where('meta.perPage', 5)
            ->where('meta.total', 13)
            ->has('links')
        );
});

test('authenticated requests are recorded in the activity log', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), [
            'name' => 'Updated Name',
            'email' => $user->email,
        ])
        ->assertRedirect(route('profile.edit'));

    $activity = UserActivity::query()->whereBelongsTo($user)->latest()->first();

    expect($activity)->not->toBeNull();
    expect($activity?->action)->toBe('Updated profile');
    expect($activity?->route_name)->toBe('profile.update');
    expect($activity?->status_code)->toBe(302);
});

test('read only page visits are not recorded in the activity log', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertOk();

    expect(UserActivity::query()->whereBelongsTo($user)->count())->toBe(0);
});
