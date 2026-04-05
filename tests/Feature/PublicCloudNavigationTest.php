<?php

use App\Models\User;

test('removed compute and game hosting pages are not available', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get('/compute/virtual-servers')
        ->assertNotFound();

    $this->actingAs($user)
        ->get('/compute/settings')
        ->assertNotFound();

    $this->actingAs($user)
        ->get('/game-hosting/servers')
        ->assertNotFound();

    $this->actingAs($user)
        ->get('/game-hosting/domains')
        ->assertNotFound();

    $this->actingAs($user)
        ->get('/game-hosting/resources')
        ->assertNotFound();
});
