<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class IpCountryResolver
{
    /**
     * Resolve a country code for the given IP address.
     */
    public function resolve(?string $ipAddress): ?string
    {
        if (! is_string($ipAddress) || blank($ipAddress) || ! $this->isPublicIp($ipAddress)) {
            return null;
        }

        return Cache::remember(
            'ip-country:'.$ipAddress,
            now()->addDays(7),
            function () use ($ipAddress): ?string {
                $response = Http::acceptJson()
                    ->timeout(3)
                    ->get("http://ip-api.com/json/{$ipAddress}", [
                        'fields' => 'status,countryCode',
                    ]);

                if (! $response->successful()) {
                    return null;
                }

                if ($response->json('status') !== 'success') {
                    return null;
                }

                $countryCode = strtoupper((string) $response->json('countryCode'));

                return in_array($countryCode, Countries::codes(), true) ? $countryCode : null;
            }
        );
    }

    /**
     * Determine whether the IP is public and geolocatable.
     */
    private function isPublicIp(string $ipAddress): bool
    {
        return filter_var(
            $ipAddress,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE,
        ) !== false;
    }
}
