import { Head } from '@inertiajs/react';
import { index as servers } from '@/actions/App/Http/Controllers/GameHosting/ServersController';
import Heading from '@/components/heading';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Servers', href: servers.url() },
];

export default function Servers() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Servers" />
            <div className="p-4">
                <Heading
                    title="Servers"
                    description="Manage your game servers."
                />
            </div>
        </AppLayout>
    );
}
