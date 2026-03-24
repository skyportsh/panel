<?php

test('returns a successful response', function () {
    $response = $this->get(route('welcome'));

    $response->assertOk();
});
