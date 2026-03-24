import { Head } from '@inertiajs/react';
import { index as resources } from '@/actions/App/Http/Controllers/GameHosting/ResourcesController';
import Heading from '@/components/heading';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resources', href: resources.url() },
];

export default function Resources() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Resources" />
            <div className="p-4">
                <Heading
                    title="Resources"
                    description="View and manage your game hosting resources."
                />
            </div>
        </AppLayout>
    );
}
