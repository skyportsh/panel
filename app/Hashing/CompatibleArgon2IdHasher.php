<?php

namespace App\Hashing;

use Illuminate\Hashing\Argon2IdHasher;

class CompatibleArgon2IdHasher extends Argon2IdHasher
{
    /**
     * @var array<int, string>
     */
    private const LEGACY_ALGORITHMS = ['argon2i', 'bcrypt'];

    public function check(#[\SensitiveParameter] $value, $hashedValue, array $options = []): bool
    {
        if (is_null($hashedValue) || strlen($hashedValue) === 0) {
            return false;
        }

        if ($this->usesLegacyAlgorithm($hashedValue)) {
            return password_verify($value, $hashedValue);
        }

        return parent::check($value, $hashedValue, $options);
    }

    public function needsRehash($hashedValue, array $options = []): bool
    {
        if ($this->usesLegacyAlgorithm($hashedValue)) {
            return true;
        }

        return parent::needsRehash($hashedValue, $options);
    }

    public function verifyConfiguration($value): bool
    {
        if ($this->usesLegacyAlgorithm($value)) {
            return true;
        }

        return parent::verifyConfiguration($value);
    }

    private function usesLegacyAlgorithm(string $hashedValue): bool
    {
        return in_array($this->info($hashedValue)['algoName'] ?? null, self::LEGACY_ALGORITHMS, true);
    }
}
