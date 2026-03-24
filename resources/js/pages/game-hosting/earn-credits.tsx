import { Head } from '@inertiajs/react';
import { index as earnCredits } from '@/actions/App/Http/Controllers/GameHosting/EarnCreditsController';
import Heading from '@/components/heading';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Earn credits', href: earnCredits.url() },
];

export default function EarnCredits() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Earn credits" />
            <div className="p-4">
                <Heading
                    title="Earn credits"
                    description="Earn credits to use towards your game hosting."
                />
            </div>
        </AppLayout>
    );
}
