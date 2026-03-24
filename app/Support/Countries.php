<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use ResourceBundle;

class Countries
{
    /**
     * Get all supported countries with flag metadata.
     *
     * @return array<int, array{code: string, iconSvg: string, name: string}>
     */
    public static function all(): array
    {
        return Cache::rememberForever('countries.all.v4', function (): array {
            /** @var ResourceBundle|null $bundle */
            $bundle = ResourceBundle::create('en', 'ICUDATA-region');

            if (! $bundle instanceof ResourceBundle) {
                return [];
            }

            /** @var ResourceBundle|null $countries */
            $countries = $bundle->get('Countries');

            if (! $countries instanceof ResourceBundle) {
                return [];
            }

            $icons = self::icons();
            $options = [];

            foreach ($countries as $code => $name) {
                if (
                    ! is_string($code)
                    || ! is_string($name)
                    || strlen($code) !== 2
                    || in_array($code, self::excludedCodes(), true)
                ) {
                    continue;
                }

                $iconSvg = self::iconFor($code, $name, $icons);

                if ($iconSvg === null) {
                    continue;
                }

                $options[] = [
                    'code' => $code,
                    'iconSvg' => $iconSvg,
                    'name' => $name,
                ];
            }

            usort($options, fn (array $left, array $right) => strcmp($left['name'], $right['name']));

            return $options;
        });
    }

    /**
     * Get the supported country codes.
     *
     * @return array<int, string>
     */
    public static function codes(): array
    {
        return array_column(self::all(), 'code');
    }

    /**
     * @param  array<string, string>  $icons
     */
    private static function iconFor(string $code, string $name, array $icons): ?string
    {
        $alias = self::aliases()[$code] ?? $name;
        $normalizedAlias = self::normalize($alias);

        return $icons[$normalizedAlias] ?? null;
    }

    /**
     * @return array<string, string>
     */
    private static function icons(): array
    {
        return Cache::rememberForever('countries.icons.v4', function (): array {
            $html = file_get_contents(base_path('flags.html'));

            if (! is_string($html) || $html === '') {
                return [];
            }

            preg_match_all(
                '/<li[^>]*data-filter-tags="[^"]+".*?(<svg\b.*?<\/svg>).*?<h2[^>]*>(.*?)<\/h2>/s',
                $html,
                $matches,
                PREG_SET_ORDER,
            );

            $icons = [];

            foreach ($matches as $match) {
                $svg = $match[1] ?? null;
                $name = $match[2] ?? null;

                if (! is_string($name) || ! is_string($svg)) {
                    continue;
                }

                $name = trim(preg_replace('/^SVG Flag of\s+/i', '', strip_tags($name)) ?? strip_tags($name));

                $icons[self::normalize($name)] = $svg;
            }

            return $icons;
        });
    }

    /**
     * @return array<string, string>
     */
    private static function aliases(): array
    {
        return [
            'AG' => 'Antigua and Barbuda',
            'AS' => 'American Samoa',
            'AX' => 'Aaland Islands',
            'BA' => 'Bosnia and Herzegovina',
            'BL' => 'Saint Barthelemy',
            'BQ' => 'Caribbean Netherlands',
            'BV' => 'Bouvet Island',
            'CC' => 'Cocos Islands',
            'CD' => 'Democratic Republic of Congo',
            'CG' => 'Republic of the Congo',
            'CI' => 'Ivory Coast',
            'CX' => 'Christmas Island',
            'GB' => 'United Kingdom',
            'GS' => 'South Georgia and the South Sandwich Islands',
            'HK' => 'Hong Kong',
            'HM' => 'Heard Island and McDonald Islands',
            'IO' => 'British Indian Ocean Territory',
            'KN' => 'Saint Kitts and Nevis',
            'LC' => 'Saint Lucia',
            'MF' => 'Saint Martin',
            'MM' => 'Myanmar',
            'MO' => 'Macao',
            'MP' => 'Northern Mariana Islands',
            'PM' => 'Saint Pierre and Miquelon',
            'PS' => 'Palestine',
            'RE' => 'Reunion',
            'SH' => 'Saint Helena',
            'SJ' => 'Svalbard and Jan Mayen',
            'ST' => 'Sao Tome and Principe',
            'SX' => 'Sint Maarten',
            'TF' => 'French Southern Territories',
            'TL' => 'Timor Leste',
            'TR' => 'Turkey',
            'TT' => 'Trinidad and Tobago',
            'UM' => 'United States Minor Outlying Islands',
            'US' => 'United States',
            'VC' => 'Saint Vincent and the Grenadines',
            'VI' => 'United States Virgin Islands',
            'WF' => 'Wallis and Futuna',
        ];
    }

    /**
     * @return array<int, string>
     */
    private static function excludedCodes(): array
    {
        return [
            'AC',
            'CP',
            'CQ',
            'DG',
            'EA',
            'EU',
            'EZ',
            'KP',
            'QO',
            'TA',
            'UN',
            'XA',
            'XB',
            'ZZ',
        ];
    }

    private static function normalize(string $value): string
    {
        $value = str_replace('&', 'and', $value);
        $value = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value) ?: $value;
        $value = strtolower($value);
        $value = preg_replace('/[^a-z0-9]+/', ' ', $value) ?? $value;

        return trim(preg_replace('/\s+/', ' ', $value) ?? $value);
    }
}
