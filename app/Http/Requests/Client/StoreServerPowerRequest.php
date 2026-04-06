<?php

namespace App\Http\Requests\Client;

use App\Support\ServerPowerState;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreServerPowerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'signal' => [
                'required',
                'string',
                Rule::in(ServerPowerState::actions()),
            ],
        ];
    }
}
