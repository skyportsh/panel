<?php

namespace App\Services;

use InvalidArgumentException;

class PanelVersionService
{
    public function current(): string
    {
        return (string) config('app.version');
    }

    public function ensureCompatible(string $daemonVersion): void
    {
        if ($daemonVersion === $this->current()) {
            return;
        }

        throw new InvalidArgumentException($this->incompatibleMessage());
    }

    public function incompatibleMessage(): string
    {
        return sprintf(
            "This version of skyportd isn't compatible with Skyport panel %s.",
            $this->current(),
        );
    }
}
