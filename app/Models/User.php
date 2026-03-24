<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable(['name', 'email', 'password', 'coins_balance', 'credit_balance', 'preferred_currency', 'preferred_currency_overridden', 'account_region', 'registration_ip', 'last_seen_ip', 'is_admin', 'suspended_at'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
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
            'account_region' => 'string',
            'coins_balance' => 'integer',
            'credit_balance' => 'integer',
            'email_verified_at' => 'datetime',
            'is_admin' => 'boolean',
            'last_seen_ip' => 'string',
            'password' => 'hashed',
            'preferred_currency_overridden' => 'boolean',
            'preferred_currency' => 'string',
            'registration_ip' => 'string',
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
}
