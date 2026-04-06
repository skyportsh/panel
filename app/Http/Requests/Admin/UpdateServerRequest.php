<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateServerRequest extends FormRequest
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
        $server = $this->route('server');

        return [
            'name' => ['required', 'string', 'max:255'],
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'node_id' => ['required', 'integer', Rule::in([$server->node_id])],
            'cargo_id' => ['required', 'integer', Rule::in([$server->cargo_id])],
            'allocation_id' => ['required', 'integer', 'exists:allocations,id'],
            'memory_mib' => ['required', 'integer', 'min:1'],
            'cpu_limit' => ['required', 'integer', 'min:0'],
            'disk_mib' => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Please enter a server name.',
            'user_id.required' => 'Please choose a user.',
            'user_id.exists' => 'Please choose a valid user.',
            'node_id.required' => 'Please choose a node.',
            'node_id.in' => 'The node cannot be changed after the server is created.',
            'cargo_id.required' => 'Please choose a cargo.',
            'cargo_id.in' => 'The cargo cannot be changed after the server is created.',
            'allocation_id.required' => 'Please choose an allocation.',
            'allocation_id.exists' => 'Please choose a valid allocation.',
            'memory_mib.required' => 'Please enter a memory limit.',
            'memory_mib.min' => 'The memory limit must be at least 1 MiB.',
            'cpu_limit.required' => 'Please enter a CPU limit.',
            'cpu_limit.min' => 'The CPU limit must be 0 or greater.',
            'disk_mib.required' => 'Please enter a disk limit.',
            'disk_mib.min' => 'The disk limit must be at least 1 MiB.',
        ];
    }
}
