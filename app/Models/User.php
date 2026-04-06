<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable(['name', 'email', 'password', 'is_admin', 'suspended_at', 'admin_notes'])]
#[
    Hidden([
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ]),
]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'is_admin' => 'boolean',
            'password' => 'hashed',
            'suspended_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
    }

    public function activities(): HasMany
    {
        return $this->hasMany(UserActivity::class);
    }

    public function passkeys(): HasMany
    {
        return $this->hasMany(Passkey::class);
    }

    public function servers(): HasMany
    {
        return $this->hasMany(Server::class);
    }
}
