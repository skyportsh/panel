<?php

namespace App\Support;

final class ServerPowerState
{
    public const START = 'start';

    public const STOP = 'stop';

    public const RESTART = 'restart';

    public const KILL = 'kill';

    public const REINSTALL = 'reinstall';

    /**
     * @return array<int, string>
     */
    public static function actions(): array
    {
        return [
            self::START,
            self::STOP,
            self::RESTART,
            self::KILL,
            self::REINSTALL,
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function allowedActionsFor(string $status): array
    {
        return match ($status) {
            'offline', 'install_failed' => [self::START, self::REINSTALL],
            'running' => [self::STOP, self::RESTART, self::REINSTALL],
            'starting' => [self::KILL, self::REINSTALL],
            'pending', 'installing' => [self::REINSTALL],
            default => [],
        };
    }

    public static function allows(string $status, string $action): bool
    {
        return in_array($action, self::allowedActionsFor($status), true);
    }

    /**
     * @return array{start: bool, stop: bool, restart: bool, kill: bool, reinstall: bool}
     */
    public static function mapFor(string $status): array
    {
        $allowed = self::allowedActionsFor($status);

        return [
            self::START => in_array(self::START, $allowed, true),
            self::STOP => in_array(self::STOP, $allowed, true),
            self::RESTART => in_array(self::RESTART, $allowed, true),
            self::KILL => in_array(self::KILL, $allowed, true),
            self::REINSTALL => in_array(self::REINSTALL, $allowed, true),
        ];
    }
}
