<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PasskeyAuthenticationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'remember' => ['nullable', 'boolean'],
            'credential' => ['required', 'array'],
            'credential.id' => ['required', 'string'],
            'credential.rawId' => ['required', 'string'],
            'credential.type' => ['required', 'string', 'in:public-key'],
            'credential.response' => ['required', 'array'],
            'credential.response.authenticatorData' => ['required', 'string'],
            'credential.response.clientDataJSON' => ['required', 'string'],
            'credential.response.signature' => ['required', 'string'],
            'credential.response.userHandle' => ['nullable', 'string'],
        ];
    }
}
