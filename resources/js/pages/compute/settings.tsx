import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import AppLayout from '@/layouts/app-layout';
import { settings } from '@/routes/compute';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Settings',
        href: settings(),
    },
];

export default function ComputeSettings() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Compute settings" />

            <div className="p-4">
                <Heading title="Settings" description="" />
            </div>
        </AppLayout>
    );
}
