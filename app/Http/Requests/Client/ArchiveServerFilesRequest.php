<?php

namespace App\Http\Requests\Client;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ArchiveServerFilesRequest extends FormRequest
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
            'path' => ['nullable', 'string', 'max:4096'],
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
                        $fail('The archive name cannot contain path separators.');
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
            'paths.required' => 'Please choose at least one file or directory to archive.',
            'paths.min' => 'Please choose at least one file or directory to archive.',
            'name.required' => 'Please enter an archive name.',
        ];
    }
}
