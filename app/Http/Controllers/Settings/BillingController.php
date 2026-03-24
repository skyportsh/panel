<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\BillingUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/billing', [
            'billing' => [
                'preferredCurrency' => $request->user()->preferred_currency,
            ],
            'currencies' => $this->currencies(),
        ]);
    }

    public function update(BillingUpdateRequest $request): RedirectResponse
    {
        $request->user()->update([
            ...$request->validated(),
            'preferred_currency_overridden' => true,
        ]);

        return to_route('billing.edit');
    }

    /**
     * @return array<int, array{code: string, name: string, symbol: string}>
     */
    private function currencies(): array
    {
        return [
            ['code' => 'USD', 'name' => 'US Dollar', 'symbol' => '$'],
            ['code' => 'EUR', 'name' => 'Euro', 'symbol' => 'EUR'],
            ['code' => 'GBP', 'name' => 'British Pound', 'symbol' => 'GBP'],
            ['code' => 'CAD', 'name' => 'Canadian Dollar', 'symbol' => 'CA$'],
            ['code' => 'AUD', 'name' => 'Australian Dollar', 'symbol' => 'A$'],
            ['code' => 'JPY', 'name' => 'Japanese Yen', 'symbol' => 'JPY'],
        ];
    }
}
