<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use App\Support\IpCountryResolver;
use App\Support\PreferredCurrency;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    public function __construct(
        private IpCountryResolver $ipCountryResolver,
    ) {}

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
        ])->validate();

        $request = request();
        $registrationIp = $request->ip();
        $accountRegion = $this->ipCountryResolver->resolve($registrationIp);

        return User::create([
            'account_region' => $accountRegion,
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
            'preferred_currency' => PreferredCurrency::forRegion($accountRegion),
            'registration_ip' => $registrationIp,
        ]);
    }
}
