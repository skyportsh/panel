<?php

namespace App\Support;

class PreferredCurrency
{
    /**
     * @var array<string, string>
     */
    private const REGION_CURRENCIES = [
        'AT' => 'EUR',
        'AU' => 'AUD',
        'BE' => 'EUR',
        'CA' => 'CAD',
        'CY' => 'EUR',
        'DE' => 'EUR',
        'EE' => 'EUR',
        'ES' => 'EUR',
        'FI' => 'EUR',
        'FR' => 'EUR',
        'GB' => 'GBP',
        'GR' => 'EUR',
        'HR' => 'EUR',
        'IE' => 'EUR',
        'IT' => 'EUR',
        'JP' => 'JPY',
        'LT' => 'EUR',
        'LU' => 'EUR',
        'LV' => 'EUR',
        'MT' => 'EUR',
        'NL' => 'EUR',
        'PT' => 'EUR',
        'SI' => 'EUR',
        'SK' => 'EUR',
        'US' => 'USD',
    ];

    public static function forRegion(?string $region): string
    {
        return self::REGION_CURRENCIES[$region ?? ''] ?? 'USD';
    }
}
