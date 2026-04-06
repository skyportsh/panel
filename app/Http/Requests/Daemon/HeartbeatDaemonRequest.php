<?php

namespace App\Http\Requests\Daemon;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class HeartbeatDaemonRequest extends FormRequest
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
            'uuid' => ['required', 'uuid'],
            'version' => ['required', 'string', 'max:50'],
            'servers' => ['nullable', 'array'],
            'servers.*.id' => ['required', 'integer', 'exists:servers,id'],
            'servers.*.status' => ['required', 'string', 'in:installing,install_failed,offline,starting,running'],
        ];
    }
}
