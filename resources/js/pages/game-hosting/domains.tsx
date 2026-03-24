import { Head } from '@inertiajs/react';
import { index as domains } from '@/actions/App/Http/Controllers/GameHosting/DomainsController';
import Heading from '@/components/heading';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Domains', href: domains.url() },
];

export default function Domains() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Domains" />
            <div className="p-4">
                <Heading
                    title="Domains"
                    description="Manage custom domains for your game servers."
                />
            </div>
        </AppLayout>
    );
}
