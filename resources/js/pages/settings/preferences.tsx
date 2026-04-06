import { Head, usePage } from "@inertiajs/react";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import AppearanceTabs from "@/components/appearance-tabs";
import Heading from "@/components/heading";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
    DEFAULT_LANDING_URL,
    getLandingOptions,
    resolveLandingUrl,
    type LandingOption,
} from "@/lib/default-landing-pages";
import AppLayout from "@/layouts/app-layout";
import SettingsLayout from "@/layouts/settings/layout";
import { edit as editPreferences } from "@/routes/preferences";
import type { BreadcrumbItem } from "@/types";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Preferences",
        href: editPreferences(),
    },
];

const STORAGE_KEY = "default-landing-url";

function DefaultLandingPage() {
    const { auth } = usePage().props;
    const landingOptions = getLandingOptions(auth.user.is_admin);
    const [selected, setSelected] = useState<string>(() =>
        typeof window !== "undefined"
            ? resolveLandingUrl(
                  localStorage.getItem(STORAGE_KEY),
                  auth.user.is_admin,
              )
            : DEFAULT_LANDING_URL,
    );
    const [saving, setSaving] = useState(false);

    const save = () => {
        setSaving(true);
        setTimeout(() => {
            localStorage.setItem(STORAGE_KEY, selected);
            setSaving(false);
            toast.success("Default landing page saved");
        }, 400);
    };

    const grouped = landingOptions.reduce<Record<string, LandingOption[]>>(
        (acc, opt) => {
            (acc[opt.group] ??= []).push(opt);

            return acc;
        },
        {},
    );

    return (
        <div className="space-y-3">
            <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Choose a page" />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(grouped).map(([group, opts]) => (
                        <SelectGroup key={group}>
                            <SelectLabel>{group}</SelectLabel>
                            {opts.map((opt) => (
                                <SelectItem key={opt.url} value={opt.url}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    ))}
                </SelectContent>
            </Select>
            <Button size="sm" onClick={save} disabled={saving}>
                {saving && <Spinner className="mr-1" />}
                Save preference
            </Button>
        </div>
    );
}

export default function Preferences() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Preferences" />

            <h1 className="sr-only">Preferences</h1>

            <SettingsLayout>
                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Appearance"
                        description="Choose how Skyport looks for you"
                    />
                    <AppearanceTabs />

                    <Heading
                        variant="small"
                        title="Default landing page"
                        description="Choose the page you're taken to after logging in"
                    />
                    <DefaultLandingPage />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
