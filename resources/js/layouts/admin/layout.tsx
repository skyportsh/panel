import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';

type AdminLayoutProps = PropsWithChildren<{
    title: string;
    description?: string;
}>;

export default function AdminLayout({
    children,
    title,
    description,
}: AdminLayoutProps) {
    return (
        <div className="px-4 py-6">
            <Heading title={title} description={description} />
            {children}
        </div>
    );
}
