<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreNodeAllocationRequest extends FormRequest
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
            'mode' => ['required', 'in:single,range'],
            'bind_ip' => ['required', 'string', 'max:255'],
            'ip_alias' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'between:1,65535'],
            'start_port' => ['nullable', 'integer', 'between:1,65535'],
            'end_port' => ['nullable', 'integer', 'between:1,65535'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $mode = $this->input('mode');

                if ($mode === 'single' && ! $this->filled('port')) {
                    $validator->errors()->add('port', 'Please choose a port.');
                }

                if ($mode === 'range') {
                    if (! $this->filled('start_port')) {
                        $validator
                            ->errors()
                            ->add(
                                'start_port',
                                'Please choose a starting port.',
                            );
                    }

                    if (! $this->filled('end_port')) {
                        $validator
                            ->errors()
                            ->add('end_port', 'Please choose an ending port.');
                    }

                    if (
                        $this->filled('start_port') &&
                        $this->filled('end_port') &&
                        (int) $this->input('end_port') <
                            (int) $this->input('start_port')
                    ) {
                        $validator
                            ->errors()
                            ->add(
                                'end_port',
                                'The ending port must be greater than or equal to the starting port.',
                            );
                    }
                }
            },
        ];
    }
}
