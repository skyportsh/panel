<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCargoRequest extends FormRequest
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
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('cargos', 'name'),
            ],
            'author' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'startup' => ['required', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Please enter a cargo name.',
            'name.unique' => 'That cargo name is already in use.',
            'author.required' => 'Please enter a cargo author.',
            'startup.required' => 'Please enter a startup command.',
        ];
    }
}
