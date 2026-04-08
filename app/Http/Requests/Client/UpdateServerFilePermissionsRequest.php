<?php

namespace App\Http\Requests\Client;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateServerFilePermissionsRequest extends FormRequest
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
            'paths' => ['required', 'array', 'min:1'],
            'paths.*' => ['required', 'string', 'max:4096'],
            'permissions' => [
                'required',
                'string',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_string($value)) {
                        $fail('Please enter a valid permission mode.');

                        return;
                    }

                    $normalized = ltrim($value, '0');
                    $normalized = $normalized === '' ? '0' : $normalized;

                    if (
                        strlen($normalized) !== 3 ||
                        strspn($normalized, '01234567') !== 3
                    ) {
                        $fail('Please enter a valid permission mode such as 644 or 755.');
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
            'paths.required' => 'Please choose at least one file or directory.',
            'paths.min' => 'Please choose at least one file or directory.',
            'permissions.required' => 'Please enter a permission mode.',
        ];
    }
}
