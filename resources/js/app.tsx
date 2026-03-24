import { createInertiaApp } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import NProgress from 'nprogress';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import '../css/app.css';
import { initializeTheme } from '@/hooks/use-appearance';

NProgress.configure({ showSpinner: false, trickleSpeed: 200 });

let timeout: ReturnType<typeof setTimeout> | null = null;

router.on('start', () => {
    timeout = setTimeout(() => NProgress.start(), 100);
});

router.on('progress', (event) => {
    if (NProgress.isStarted() && event.detail.progress?.percentage) {
        NProgress.set((event.detail.progress.percentage / 100) * 0.9);
    }
});

router.on('finish', (event) => {
    if (timeout) {
        clearTimeout(timeout);
        timeout = null;
    }

    if (!NProgress.isStarted()) {
        return;
    }

    if (event.detail.visit.completed) {
        NProgress.done();
    } else if (event.detail.visit.interrupted) {
        NProgress.set(0);
    } else if (event.detail.visit.cancelled) {
        NProgress.done();
        NProgress.remove();
    }
});

const appName = import.meta.env.VITE_APP_NAME || 'Altare';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <TooltipProvider delayDuration={0}>
                <App {...props} />
            </TooltipProvider>,
        );
    },
    progress: false,
});

// This will set light / dark mode on load...
initializeTheme();
