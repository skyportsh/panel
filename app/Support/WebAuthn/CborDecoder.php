<?php

namespace App\Support\WebAuthn;

class CborDecoder
{
    /**
     * @return array{value: mixed, bytes: int}
     */
    public static function decodeFirst(string $payload): array
    {
        $offset = 0;
        $value = self::decodeItem($payload, $offset);

        return [
            'value' => $value,
            'bytes' => $offset,
        ];
    }

    private static function decodeItem(string $payload, int &$offset): mixed
    {
        if (! isset($payload[$offset])) {
            throw new \InvalidArgumentException(
                'Unexpected end of CBOR payload.',
            );
        }

        $initialByte = ord($payload[$offset]);
        $offset++;

        $majorType = $initialByte >> 5;
        $additionalInformation = $initialByte & 0x1F;
        $length = self::readLength($payload, $offset, $additionalInformation);

        return match ($majorType) {
            0 => $length,
            1 => -1 - $length,
            2 => self::readBytes($payload, $offset, $length),
            3 => self::readText($payload, $offset, $length),
            4 => self::readArray($payload, $offset, $length),
            5 => self::readMap($payload, $offset, $length),
            6 => self::decodeItem($payload, $offset),
            7 => self::readSimpleValue($additionalInformation),
            default => throw new \InvalidArgumentException(
                'Unsupported CBOR major type.',
            ),
        };
    }

    private static function readLength(
        string $payload,
        int &$offset,
        int $additionalInformation,
    ): int {
        return match (true) {
            $additionalInformation < 24 => $additionalInformation,
            $additionalInformation === 24 => self::readUnsignedInteger(
                $payload,
                $offset,
                1,
            ),
            $additionalInformation === 25 => self::readUnsignedInteger(
                $payload,
                $offset,
                2,
            ),
            $additionalInformation === 26 => self::readUnsignedInteger(
                $payload,
                $offset,
                4,
            ),
            $additionalInformation === 27 => self::readUnsignedInteger(
                $payload,
                $offset,
                8,
            ),
            default => throw new \InvalidArgumentException(
                'Indefinite CBOR lengths are not supported.',
            ),
        };
    }

    private static function readUnsignedInteger(
        string $payload,
        int &$offset,
        int $length,
    ): int {
        $bytes = self::readBytes($payload, $offset, $length);
        $value = 0;

        foreach (unpack('C*', $bytes) as $byte) {
            $value = ($value << 8) | $byte;
        }

        return $value;
    }

    private static function readBytes(
        string $payload,
        int &$offset,
        int $length,
    ): string {
        $value = substr($payload, $offset, $length);

        if (strlen($value) !== $length) {
            throw new \InvalidArgumentException(
                'Unexpected end of CBOR byte string.',
            );
        }

        $offset += $length;

        return $value;
    }

    private static function readText(
        string $payload,
        int &$offset,
        int $length,
    ): string {
        return self::readBytes($payload, $offset, $length);
    }

    /**
     * @return array<int, mixed>
     */
    private static function readArray(
        string $payload,
        int &$offset,
        int $length,
    ): array {
        $items = [];

        for ($index = 0; $index < $length; $index++) {
            $items[] = self::decodeItem($payload, $offset);
        }

        return $items;
    }

    /**
     * @return array<int|string, mixed>
     */
    private static function readMap(
        string $payload,
        int &$offset,
        int $length,
    ): array {
        $items = [];

        for ($index = 0; $index < $length; $index++) {
            $key = self::decodeItem($payload, $offset);
            $items[$key] = self::decodeItem($payload, $offset);
        }

        return $items;
    }

    private static function readSimpleValue(int $additionalInformation): mixed
    {
        return match ($additionalInformation) {
            20 => false,
            21 => true,
            22 => null,
            default => throw new \InvalidArgumentException(
                'Unsupported CBOR simple value.',
            ),
        };
    }
}
