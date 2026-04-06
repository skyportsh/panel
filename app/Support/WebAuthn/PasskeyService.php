<?php

namespace App\Support\WebAuthn;

use App\Models\Passkey;
use App\Models\User;
use Illuminate\Contracts\Auth\StatefulGuard;
use Illuminate\Contracts\Session\Session;
use Illuminate\Validation\ValidationException;

class PasskeyService
{
    private const REGISTRATION_SESSION_KEY = 'passkeys.registration';

    private const AUTHENTICATION_SESSION_KEY = 'passkeys.authentication';

    /**
     * @return array{publicKey: array<string, mixed>}
     */
    public function registrationOptions(
        User $user,
        Session $session,
        string $rpId,
    ): array {
        $challenge = Base64Url::encode(random_bytes(32));

        $session->put(self::REGISTRATION_SESSION_KEY, [
            'challenge' => $challenge,
            'user_id' => $user->getKey(),
        ]);

        return [
            'publicKey' => [
                'attestation' => 'none',
                'authenticatorSelection' => [
                    'residentKey' => 'required',
                    'userVerification' => 'preferred',
                ],
                'challenge' => $challenge,
                'excludeCredentials' => $user
                    ->passkeys()
                    ->get(['credential_id', 'transports'])
                    ->map(
                        fn (Passkey $passkey): array => [
                            'id' => $passkey->credential_id,
                            'transports' => $passkey->transports ?? [],
                            'type' => 'public-key',
                        ],
                    )
                    ->values()
                    ->all(),
                'pubKeyCredParams' => [
                    ['alg' => -7, 'type' => 'public-key'],
                    ['alg' => -257, 'type' => 'public-key'],
                ],
                'rp' => [
                    'id' => $rpId,
                    'name' => config('app.name'),
                ],
                'timeout' => 60000,
                'user' => [
                    'displayName' => $user->name,
                    'id' => Base64Url::encode((string) $user->getKey()),
                    'name' => $user->email,
                ],
            ],
        ];
    }

    /**
     * @param  array{name?: ?string, credential: array<string, mixed>}  $payload
     */
    public function register(
        User $user,
        Session $session,
        array $payload,
        string $origin,
        string $rpId,
    ): Passkey {
        $registrationSession = $session->pull(self::REGISTRATION_SESSION_KEY);

        if (
            ! is_array($registrationSession) ||
            ($registrationSession['user_id'] ?? null) !== $user->getKey()
        ) {
            throw ValidationException::withMessages([
                'passkey' => 'Your passkey setup session has expired. Try again.',
            ]);
        }

        $credential = $payload['credential'];
        $clientDataJson = Base64Url::decode(
            $credential['response']['clientDataJSON'],
        );
        $clientData = json_decode($clientDataJson, true);

        if (! is_array($clientData)) {
            throw $this->validationException(
                'passkey',
                'The passkey response was invalid.',
            );
        }

        $this->assertClientData(
            $clientData,
            'webauthn.create',
            $registrationSession['challenge'],
            $origin,
        );

        $attestationObject = Base64Url::decode(
            $credential['response']['attestationObject'],
        );
        $attestation = CborDecoder::decodeFirst($attestationObject)['value'];

        if (
            ! is_array($attestation) ||
            ! isset($attestation['authData']) ||
            ! is_string($attestation['authData'])
        ) {
            throw $this->validationException(
                'passkey',
                'The passkey attestation was invalid.',
            );
        }

        $authenticatorData = $this->parseAuthenticatorData(
            $attestation['authData'],
            true,
        );
        $this->assertRpIdHash($authenticatorData['rpIdHash'], $rpId);

        $credentialId = Base64Url::encode($authenticatorData['credentialId']);
        $rawId = Base64Url::encode(Base64Url::decode($credential['rawId']));

        if (! hash_equals($credentialId, $rawId)) {
            throw $this->validationException(
                'passkey',
                'The passkey identifier did not match the attestation.',
            );
        }

        if (Passkey::query()->where('credential_id', $credentialId)->exists()) {
            throw $this->validationException(
                'passkey',
                'This passkey has already been registered.',
            );
        }

        return $user->passkeys()->create([
            'aaguid' => $this->formatAaguid($authenticatorData['aaguid']),
            'counter' => $authenticatorData['signCount'],
            'credential_id' => $credentialId,
            'name' => $this->passkeyName($user, $payload['name'] ?? null),
            'public_key' => CoseKey::toPem(
                $authenticatorData['credentialPublicKey'],
            ),
            'transports' => $credential['response']['transports'] ?? [],
        ]);
    }

    /**
     * @return array{publicKey: array<string, mixed>}
     */
    public function authenticationOptions(Session $session, string $rpId): array
    {
        $challenge = Base64Url::encode(random_bytes(32));

        $session->put(self::AUTHENTICATION_SESSION_KEY, [
            'challenge' => $challenge,
        ]);

        return [
            'publicKey' => [
                'allowCredentials' => [],
                'challenge' => $challenge,
                'rpId' => $rpId,
                'timeout' => 60000,
                'userVerification' => 'preferred',
            ],
        ];
    }

    /**
     * @param  array{credential: array<string, mixed>, remember?: bool}  $payload
     */
    public function authenticate(
        StatefulGuard $guard,
        Session $session,
        array $payload,
        string $origin,
        string $rpId,
    ): User {
        $authenticationSession = $session->pull(
            self::AUTHENTICATION_SESSION_KEY,
        );

        if (! is_array($authenticationSession)) {
            throw ValidationException::withMessages([
                'passkey' => 'Your passkey sign-in session has expired. Try again.',
            ]);
        }

        $credential = $payload['credential'];
        $credentialId = Base64Url::encode(
            Base64Url::decode($credential['rawId']),
        );
        $passkey = Passkey::query()
            ->with('user')
            ->where('credential_id', $credentialId)
            ->first();

        if ($passkey === null) {
            throw $this->validationException(
                'passkey',
                'We could not find a matching passkey.',
            );
        }

        $clientDataJson = Base64Url::decode(
            $credential['response']['clientDataJSON'],
        );
        $clientData = json_decode($clientDataJson, true);

        if (! is_array($clientData)) {
            throw $this->validationException(
                'passkey',
                'The passkey response was invalid.',
            );
        }

        $this->assertClientData(
            $clientData,
            'webauthn.get',
            $authenticationSession['challenge'],
            $origin,
        );

        $authenticatorDataBinary = Base64Url::decode(
            $credential['response']['authenticatorData'],
        );
        $authenticatorData = $this->parseAuthenticatorData(
            $authenticatorDataBinary,
            false,
        );
        $this->assertRpIdHash($authenticatorData['rpIdHash'], $rpId);

        if (($authenticatorData['flags'] & 0x01) !== 0x01) {
            throw $this->validationException(
                'passkey',
                'The passkey assertion did not prove user presence.',
            );
        }

        $signature = Base64Url::decode($credential['response']['signature']);
        $signedBytes =
            $authenticatorDataBinary.hash('sha256', $clientDataJson, true);
        $verification = openssl_verify(
            $signedBytes,
            $signature,
            $passkey->public_key,
            OPENSSL_ALGO_SHA256,
        );

        if ($verification !== 1) {
            throw $this->validationException(
                'passkey',
                'The passkey signature could not be verified.',
            );
        }

        if (
            $authenticatorData['signCount'] > 0 &&
            $authenticatorData['signCount'] <= $passkey->counter
        ) {
            throw $this->validationException(
                'passkey',
                'This passkey response could not be trusted.',
            );
        }

        if ($passkey->user->isSuspended()) {
            throw $this->validationException(
                'passkey',
                'This account is suspended.',
            );
        }

        $passkey
            ->forceFill([
                'counter' => max(
                    $passkey->counter,
                    $authenticatorData['signCount'],
                ),
                'last_used_at' => now(),
            ])
            ->save();

        $guard->login($passkey->user, (bool) ($payload['remember'] ?? false));
        $session->regenerate();

        return $passkey->user;
    }

    /**
     * @return array{
     *     rpIdHash: string,
     *     flags: int,
     *     signCount: int,
     *     aaguid: ?string,
     *     credentialId: ?string,
     *     credentialPublicKey: array<int|string, mixed>|null
     * }
     */
    private function parseAuthenticatorData(
        string $payload,
        bool $requireAttestedCredentialData,
    ): array {
        if (strlen($payload) < 37) {
            throw $this->validationException(
                'passkey',
                'The authenticator data was incomplete.',
            );
        }

        $offset = 0;
        $rpIdHash = substr($payload, $offset, 32);
        $offset += 32;

        $flags = ord($payload[$offset]);
        $offset++;

        $signCount = unpack('N', substr($payload, $offset, 4))[1];
        $offset += 4;

        $result = [
            'aaguid' => null,
            'credentialId' => null,
            'credentialPublicKey' => null,
            'flags' => $flags,
            'rpIdHash' => $rpIdHash,
            'signCount' => $signCount,
        ];

        if (($flags & 0x40) !== 0x40) {
            if ($requireAttestedCredentialData) {
                throw $this->validationException(
                    'passkey',
                    'The authenticator data did not contain a credential.',
                );
            }

            return $result;
        }

        if (strlen($payload) < $offset + 18) {
            throw $this->validationException(
                'passkey',
                'The authenticator attestation data was incomplete.',
            );
        }

        $aaguid = substr($payload, $offset, 16);
        $offset += 16;

        $credentialLength = unpack('n', substr($payload, $offset, 2))[1];
        $offset += 2;

        $credentialId = substr($payload, $offset, $credentialLength);
        $offset += $credentialLength;

        if (strlen($credentialId) !== $credentialLength) {
            throw $this->validationException(
                'passkey',
                'The authenticator credential data was invalid.',
            );
        }

        $credentialPublicKey = CborDecoder::decodeFirst(
            substr($payload, $offset),
        )['value'];

        if (! is_array($credentialPublicKey)) {
            throw $this->validationException(
                'passkey',
                'The credential public key was invalid.',
            );
        }

        $result['aaguid'] = $aaguid;
        $result['credentialId'] = $credentialId;
        $result['credentialPublicKey'] = $credentialPublicKey;

        return $result;
    }

    /**
     * @param  array<string, mixed>  $clientData
     */
    private function assertClientData(
        array $clientData,
        string $expectedType,
        string $expectedChallenge,
        string $origin,
    ): void {
        if (($clientData['type'] ?? null) !== $expectedType) {
            throw $this->validationException(
                'passkey',
                'The passkey response type was invalid.',
            );
        }

        if (($clientData['challenge'] ?? null) !== $expectedChallenge) {
            throw $this->validationException(
                'passkey',
                'The passkey challenge did not match.',
            );
        }

        $clientOrigin = $clientData['origin'] ?? null;

        if (! is_string($clientOrigin)) {
            throw $this->validationException(
                'passkey',
                'The passkey response came from an unexpected origin.',
            );
        }

        $expectedOrigins = array_filter([
            $this->normalizeOrigin($origin),
            $this->normalizeOrigin((string) config('app.url')),
        ]);

        if (
            ! in_array(
                $this->normalizeOrigin($clientOrigin),
                $expectedOrigins,
                true,
            )
        ) {
            throw $this->validationException(
                'passkey',
                'The passkey response came from an unexpected origin.',
            );
        }
    }

    private function assertRpIdHash(string $rpIdHash, string $rpId): void
    {
        if (! hash_equals(hash('sha256', $rpId, true), $rpIdHash)) {
            throw $this->validationException(
                'passkey',
                'The passkey response targeted an unexpected relying party.',
            );
        }
    }

    private function passkeyName(User $user, ?string $name): string
    {
        $label = trim((string) $name);

        if ($label !== '') {
            return $label;
        }

        return 'Passkey '.($user->passkeys()->count() + 1);
    }

    private function formatAaguid(?string $aaguid): ?string
    {
        if ($aaguid === null) {
            return null;
        }

        $hex = bin2hex($aaguid);

        if ($hex === str_repeat('0', 32)) {
            return null;
        }

        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hex, 0, 8),
            substr($hex, 8, 4),
            substr($hex, 12, 4),
            substr($hex, 16, 4),
            substr($hex, 20, 12),
        );
    }

    private function validationException(
        string $field,
        string $message,
    ): ValidationException {
        return ValidationException::withMessages([$field => $message]);
    }

    private function normalizeOrigin(string $origin): string
    {
        $parts = parse_url($origin);

        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            return '';
        }

        $port = $parts['port'] ?? null;
        $defaultPort = match ($parts['scheme']) {
            'http' => 80,
            'https' => 443,
            default => null,
        };

        return sprintf(
            '%s://%s%s',
            $parts['scheme'],
            $parts['host'],
            $port !== null && $port !== $defaultPort ? ':'.$port : '',
        );
    }
}
