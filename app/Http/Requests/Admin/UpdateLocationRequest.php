<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLocationRequest extends FormRequest
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
        $locationId = $this->route('location')?->id;

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('locations', 'name')->ignore($locationId),
            ],
            'country' => ['required', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Please enter a location name.',
            'name.unique' => 'That location name is already in use.',
            'country.required' => 'Please choose a country.',
        ];
    }
}
