<?php

use App\Http\Middleware\RecordUserActivity;
use App\Models\User;
use App\Models\UserActivity;
use App\Support\IpCountryResolver;
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

    $this->app->bind(IpCountryResolver::class, fn () => new class extends IpCountryResolver
    {
        public function resolve(?string $ipAddress): ?string
        {
            return $ipAddress === '8.8.8.8' ? 'GB' : null;
        }
    });

    $this->actingAs($user)
        ->from(route('profile.edit'))
        ->withServerVariables(['REMOTE_ADDR' => '8.8.8.8'])
        ->patch(route('profile.update'), [
            'name' => 'Updated Name',
            'email' => $user->email,
            'account_region' => 'GB',
        ])
        ->assertRedirect(route('profile.edit'));

    $activity = UserActivity::query()->whereBelongsTo($user)->latest()->first();

    expect($activity)->not->toBeNull();
    expect($activity?->action)->toBe('Updated profile');
    expect($activity?->route_name)->toBe('profile.update');
    expect($activity?->ip_address)->toBe('8.8.8.8');
    expect($activity?->country_code)->toBe('GB');
    expect($activity?->country_name)->toBe('United Kingdom');
    expect($activity?->status_code)->toBe(302);
});

test('read only page visits are not recorded in the activity log', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertOk();

    expect(UserActivity::query()->whereBelongsTo($user)->count())->toBe(0);
});
