<?php

use App\Models\Passkey;
use App\Models\User;
use App\Support\WebAuthn\Base64Url;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;

test('security page includes registered passkeys', function () {
    Features::twoFactorAuthentication([
        'confirm' => true,
        'confirmPassword' => true,
    ]);

    $user = User::factory()->create();
    $passkey = Passkey::factory()->for($user)->create([
        'name' => 'MacBook Touch ID',
    ]);

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->get(route('security.edit'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('settings/security')
            ->where('passkeys.0.id', $passkey->id)
            ->where('passkeys.0.name', 'MacBook Touch ID'),
        );
});

test('authenticated users can request passkey registration options', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson(route('passkeys.create'));

    $response
        ->assertOk()
        ->assertJsonPath('publicKey.rp.name', config('app.name'))
        ->assertJsonPath('publicKey.user.name', $user->email);

    expect(session('passkeys.registration.challenge'))->not->toBeEmpty();
});

test('authenticated users can register a passkey', function () {
    $user = User::factory()->create();
    $origin = rtrim((string) config('app.url'), '/');
    $rpId = parse_url((string) config('app.url'), PHP_URL_HOST) ?: 'localhost';

    $this->actingAs($user)->getJson(route('passkeys.create'))->assertOk();

    $challenge = session('passkeys.registration.challenge');
    $payload = makeRegistrationPayload($challenge, $origin, $rpId);

    $this->actingAs($user)
        ->postJson(route('passkeys.store'), $payload)
        ->assertCreated()
        ->assertJsonPath('passkey.name', 'Passkey');

    $storedPasskey = $user->fresh()->passkeys()->first();

    expect($storedPasskey)
        ->not->toBeNull()
        ->and($storedPasskey->credential_id)->toBe($payload['credential']['rawId']);
});

test('authenticated users can delete their own passkeys', function () {
    $user = User::factory()->create();
    $passkey = Passkey::factory()->for($user)->create();

    $this->actingAs($user)
        ->delete(route('passkeys.destroy', $passkey))
        ->assertNoContent();

    $this->assertDatabaseMissing('passkeys', [
        'id' => $passkey->id,
    ]);
});

/**
 * @return array{name: string, credential: array<string, mixed>}
 */
function makeRegistrationPayload(string $challenge, string $origin, string $rpId): array
{
    $credentialId = random_bytes(32);
    $keyPair = openssl_pkey_new([
        'curve_name' => 'prime256v1',
        'private_key_type' => OPENSSL_KEYTYPE_EC,
    ]);
    $details = openssl_pkey_get_details($keyPair);

    $credentialPublicKey = cborMap([
        [cborUnsigned(1), cborUnsigned(2)],
        [cborUnsigned(3), cborNegative(7)],
        [cborNegative(1), cborUnsigned(1)],
        [cborNegative(2), cborBytes($details['ec']['x'])],
        [cborNegative(3), cborBytes($details['ec']['y'])],
    ]);

    $authenticatorData = hash('sha256', $rpId, true)
        .chr(0x41)
        .pack('N', 0)
        .str_repeat("\x00", 16)
        .pack('n', strlen($credentialId))
        .$credentialId
        .$credentialPublicKey;

    $attestationObject = cborMap([
        [cborText('fmt'), cborText('none')],
        [cborText('attStmt'), cborMap([])],
        [cborText('authData'), cborBytes($authenticatorData)],
    ]);

    $clientDataJson = json_encode([
        'challenge' => $challenge,
        'origin' => $origin,
        'type' => 'webauthn.create',
    ], JSON_THROW_ON_ERROR);

    return [
        'name' => 'Passkey',
        'credential' => [
            'id' => Base64Url::encode($credentialId),
            'rawId' => Base64Url::encode($credentialId),
            'response' => [
                'attestationObject' => Base64Url::encode($attestationObject),
                'clientDataJSON' => Base64Url::encode($clientDataJson),
                'transports' => ['internal'],
            ],
            'type' => 'public-key',
        ],
    ];
}

function cborUnsigned(int $value): string
{
    return cborMajor(0, $value);
}

function cborNegative(int $absoluteValue): string
{
    return cborMajor(1, $absoluteValue - 1);
}

function cborBytes(string $value): string
{
    return cborMajor(2, strlen($value)).$value;
}

function cborText(string $value): string
{
    return cborMajor(3, strlen($value)).$value;
}

/**
 * @param  array<int, array{0: string, 1: string}>  $pairs
 */
function cborMap(array $pairs): string
{
    $encoded = cborMajor(5, count($pairs));

    foreach ($pairs as [$key, $value]) {
        $encoded .= $key.$value;
    }

    return $encoded;
}

function cborMajor(int $majorType, int $value): string
{
    if ($value < 24) {
        return chr(($majorType << 5) | $value);
    }

    if ($value < 256) {
        return chr(($majorType << 5) | 24).pack('C', $value);
    }

    if ($value < 65536) {
        return chr(($majorType << 5) | 25).pack('n', $value);
    }

    return chr(($majorType << 5) | 26).pack('N', $value);
}
