<?php

namespace App\Support\WebAuthn;

class Base64Url
{
    public static function encode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    public static function decode(string $value): string
    {
        $padding = (4 - (strlen($value) % 4)) % 4;
        $decoded = base64_decode(
            strtr($value.str_repeat('=', $padding), '-_', '+/'),
            true,
        );

        if ($decoded === false) {
            throw new \InvalidArgumentException('Invalid base64url payload.');
        }

        return $decoded;
    }
}
