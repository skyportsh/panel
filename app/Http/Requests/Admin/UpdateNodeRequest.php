<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateNodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->is_admin ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $nodeId = $this->route('node')?->id;

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('nodes', 'name')->ignore($nodeId),
            ],
            'location_id' => ['required', 'integer', 'exists:locations,id'],
            'fqdn' => [
                'required',
                'string',
                'max:255',
                Rule::unique('nodes', 'fqdn')->ignore($nodeId),
            ],
            'daemon_port' => ['required', 'integer', 'between:1,65535'],
            'sftp_port' => ['required', 'integer', 'between:1,65535'],
            'use_ssl' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Please enter a node name.',
            'location_id.required' => 'Please choose a location.',
            'location_id.exists' => 'Please choose a valid location.',
            'fqdn.required' => 'Please enter the node FQDN.',
            'fqdn.unique' => 'That FQDN is already in use.',
            'daemon_port.between' => 'The daemon port must be between 1 and 65535.',
            'sftp_port.between' => 'The SFTP port must be between 1 and 65535.',
        ];
    }
}
