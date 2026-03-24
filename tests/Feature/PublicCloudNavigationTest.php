<?php

use App\Models\User;

test('guests are redirected from compute pages', function () {
    $this->get(route('compute.virtual-servers'))
        ->assertRedirect(route('login'));

    $this->get(route('compute.settings'))
        ->assertRedirect(route('login'));
});

test('authenticated users can visit compute pages', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('compute.virtual-servers'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('compute.settings'))
        ->assertOk();
});
