<?php

namespace App\Http\Requests\Admin;

use App\Services\AppSettingsService;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAppSettingsRequest extends FormRequest
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
            'app_name' => ['required', 'string', 'max:255'],
            'announcement' => ['nullable', 'string', 'max:1000'],
            'announcement_enabled' => ['boolean'],
            'announcement_type' => ['nullable', 'string', 'in:success,warning,alert,update,information'],
            'announcement_dismissable' => ['boolean'],
            'announcement_icon' => [
                'nullable',
                'string',
                Rule::in(AppSettingsService::announcementIcons()),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'app_name.required' => 'Please enter an application name.',
        ];
    }
}
