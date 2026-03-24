import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import AppLayout from '@/layouts/app-layout';
import { virtualServers } from '@/routes/compute';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Virtual servers',
        href: virtualServers(),
    },
];

export default function VirtualServers() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Virtual servers" />

            <div className="p-4">
                <Heading title="Virtual servers" description="" />
            </div>
        </AppLayout>
    );
}
