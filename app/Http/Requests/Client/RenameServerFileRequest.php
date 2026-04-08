<?php

namespace App\Http\Requests\Client;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RenameServerFileRequest extends FormRequest
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
            'path' => ['required', 'string', 'max:4096'],
            'name' => [
                'required',
                'string',
                'max:255',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (
                        ! is_string($value) ||
                        str_contains($value, '/') ||
                        str_contains($value, '\\')
                    ) {
                        $fail('The file or directory name cannot contain path separators.');
                    }
                },
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'path.required' => 'Please choose a file or directory to rename.',
            'name.required' => 'Please enter a new name.',
        ];
    }
}
