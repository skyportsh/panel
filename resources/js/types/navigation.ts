import type { InertiaLinkProps } from "@inertiajs/react";
import type { LucideIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps["href"]>;
};

export type NavItem = {
    title: string;
    href?: NonNullable<InertiaLinkProps["href"]>;
    icon?: LucideIcon | ComponentType<SVGProps<SVGSVGElement>> | null;
    isActive?: boolean;
    pinnable?: boolean;
    items?: NavItem[];
};
