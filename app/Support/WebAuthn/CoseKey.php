<?php

namespace App\Support\WebAuthn;

class CoseKey
{
    /**
     * @param  array<int|string, mixed>  $key
     */
    public static function toPem(array $key): string
    {
        return match ($key[1] ?? null) {
            2 => self::ec2ToPem($key),
            3 => self::rsaToPem($key),
            default => throw new \InvalidArgumentException(
                'Unsupported COSE key type.',
            ),
        };
    }

    /**
     * @param  array<int|string, mixed>  $key
     */
    private static function ec2ToPem(array $key): string
    {
        if (($key[3] ?? null) !== -7) {
            throw new \InvalidArgumentException(
                'Only ES256 passkeys are supported.',
            );
        }

        $x = $key[-2] ?? null;
        $y = $key[-3] ?? null;

        if (! is_string($x) || ! is_string($y)) {
            throw new \InvalidArgumentException(
                'Invalid EC2 public key coordinates.',
            );
        }

        $algorithmIdentifier = self::asn1Sequence(
            self::asn1ObjectIdentifier('1.2.840.10045.2.1').
                self::asn1ObjectIdentifier('1.2.840.10045.3.1.7'),
        );

        $subjectPublicKey = self::asn1BitString("\x04".$x.$y);

        return self::pemEncode(
            self::asn1Sequence($algorithmIdentifier.$subjectPublicKey),
            'PUBLIC KEY',
        );
    }

    /**
     * @param  array<int|string, mixed>  $key
     */
    private static function rsaToPem(array $key): string
    {
        $modulus = $key[-1] ?? null;
        $exponent = $key[-2] ?? null;

        if (! is_string($modulus) || ! is_string($exponent)) {
            throw new \InvalidArgumentException('Invalid RSA public key.');
        }

        $rsaPublicKey = self::asn1Sequence(
            self::asn1Integer($modulus).self::asn1Integer($exponent),
        );

        $algorithmIdentifier = self::asn1Sequence(
            self::asn1ObjectIdentifier('1.2.840.113549.1.1.1').
                self::asn1Null(),
        );

        return self::pemEncode(
            self::asn1Sequence(
                $algorithmIdentifier.self::asn1BitString($rsaPublicKey),
            ),
            'PUBLIC KEY',
        );
    }

    private static function pemEncode(string $der, string $label): string
    {
        return sprintf(
            "-----BEGIN %s-----\n%s-----END %s-----\n",
            $label,
            chunk_split(base64_encode($der), 64, "\n"),
            $label,
        );
    }

    private static function asn1Sequence(string $payload): string
    {
        return "\x30".self::asn1Length(strlen($payload)).$payload;
    }

    private static function asn1Integer(string $payload): string
    {
        $normalized = ltrim($payload, "\x00");
        $normalized = $normalized === '' ? "\x00" : $normalized;

        if ((ord($normalized[0]) & 0x80) !== 0) {
            $normalized = "\x00".$normalized;
        }

        return "\x02".self::asn1Length(strlen($normalized)).$normalized;
    }

    private static function asn1BitString(string $payload): string
    {
        return "\x03".
            self::asn1Length(strlen($payload) + 1).
            "\x00".
            $payload;
    }

    private static function asn1Null(): string
    {
        return "\x05\x00";
    }

    private static function asn1ObjectIdentifier(string $oid): string
    {
        $parts = array_map('intval', explode('.', $oid));
        $encoded = chr(40 * $parts[0] + $parts[1]);

        foreach (array_slice($parts, 2) as $part) {
            $segment = '';

            do {
                $segment = chr($part & 0x7F).$segment;
                $part >>= 7;
            } while ($part > 0);

            $bytes = unpack('C*', $segment);
            $count = count($bytes);

            foreach ($bytes as $index => $byte) {
                $encoded .= chr($index === $count ? $byte : $byte | 0x80);
            }
        }

        return "\x06".self::asn1Length(strlen($encoded)).$encoded;
    }

    private static function asn1Length(int $length): string
    {
        if ($length < 128) {
            return chr($length);
        }

        $bytes = '';

        while ($length > 0) {
            $bytes = chr($length & 0xFF).$bytes;
            $length >>= 8;
        }

        return chr(0x80 | strlen($bytes)).$bytes;
    }
}
