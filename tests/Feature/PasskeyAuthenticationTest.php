<?php

use App\Models\Passkey;
use App\Models\User;
use App\Support\WebAuthn\Base64Url;
use App\Support\WebAuthn\CoseKey;
use Inertia\Testing\AssertableInertia as Assert;

test('login screen exposes passkey support', function () {
    $this->get(route('login'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('auth/login')
            ->where('canUsePasskeys', true),
        );
});

test('guests can request passkey authentication options', function () {
    $response = $this->getJson(route('passkeys.authentication.create'));

    $response
        ->assertOk()
        ->assertJsonPath('publicKey.rpId', 'localhost');

    expect(session('passkeys.authentication.challenge'))->not->toBeEmpty();
});

test('users can authenticate with a registered passkey', function () {
    $user = User::factory()->create();
    [$privateKey, $passkey] = storedPasskeyFor($user);
    $origin = rtrim((string) config('app.url'), '/');
    $rpId = parse_url((string) config('app.url'), PHP_URL_HOST) ?: 'localhost';

    $this->getJson(route('passkeys.authentication.create'))->assertOk();

    $challenge = session('passkeys.authentication.challenge');
    $payload = makeAuthenticationPayload($challenge, $origin, $rpId, $passkey, $privateKey);

    $this->postJson(route('passkeys.authentication.store'), $payload)
        ->assertOk()
        ->assertJsonStructure(['redirect']);

    $this->assertAuthenticatedAs($user);
    expect($passkey->fresh()->last_used_at)->not->toBeNull();
});

/**
 * @return array{0: string, 1: Passkey}
 */
function storedPasskeyFor(User $user): array
{
    $keyPair = openssl_pkey_new([
        'curve_name' => 'prime256v1',
        'private_key_type' => OPENSSL_KEYTYPE_EC,
    ]);

    openssl_pkey_export($keyPair, $privateKey);

    $details = openssl_pkey_get_details($keyPair);
    $credentialId = random_bytes(32);
    $publicKey = CoseKey::toPem([
        1 => 2,
        3 => -7,
        -1 => 1,
        -2 => $details['ec']['x'],
        -3 => $details['ec']['y'],
    ]);

    $passkey = Passkey::factory()->for($user)->create([
        'counter' => 0,
        'credential_id' => Base64Url::encode($credentialId),
        'name' => 'iPhone Passkey',
        'public_key' => $publicKey,
    ]);

    return [$privateKey, $passkey];
}

/**
 * @param  array{credential_id: string}|Passkey  $passkey
 * @return array{credential: array<string, mixed>, remember: bool}
 */
function makeAuthenticationPayload(
    string $challenge,
    string $origin,
    string $rpId,
    Passkey $passkey,
    string $privateKey,
): array {
    $authenticatorData = hash('sha256', $rpId, true)
        .chr(0x01)
        .pack('N', 1);

    $clientDataJson = json_encode([
        'challenge' => $challenge,
        'origin' => $origin,
        'type' => 'webauthn.get',
    ], JSON_THROW_ON_ERROR);

    openssl_sign(
        $authenticatorData.hash('sha256', $clientDataJson, true),
        $signature,
        $privateKey,
        OPENSSL_ALGO_SHA256,
    );

    return [
        'credential' => [
            'id' => $passkey->credential_id,
            'rawId' => $passkey->credential_id,
            'response' => [
                'authenticatorData' => Base64Url::encode($authenticatorData),
                'clientDataJSON' => Base64Url::encode($clientDataJson),
                'signature' => Base64Url::encode($signature),
                'userHandle' => null,
            ],
            'type' => 'public-key',
        ],
        'remember' => true,
    ];
}
