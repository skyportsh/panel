<?php

namespace App\Http\Requests\Daemon;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ConfigureDaemonRequest extends FormRequest
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
            'token' => ['required', 'string'],
            'uuid' => ['required', 'uuid'],
            'version' => ['required', 'string', 'max:50'],
            'hostname' => ['nullable', 'string', 'max:255'],
            'reported_ip' => ['nullable', 'ip'],
            'os' => ['nullable', 'string', 'max:100'],
            'arch' => ['nullable', 'string', 'max:100'],
            'capabilities' => ['nullable', 'array'],
            'docker' => ['nullable', 'array'],
        ];
    }
}
