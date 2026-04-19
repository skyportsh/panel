import { createInertiaApp } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import NProgress from 'nprogress';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import '../css/app.css';
import { initializeTheme } from '@/hooks/use-appearance';

NProgress.configure({ showSpinner: false, trickleSpeed: 200, minimum: 0.15 });

let timeout: ReturnType<typeof setTimeout> | null = null;

router.on('start', () => {
    timeout = setTimeout(() => NProgress.start(), 250);
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

type SharedPageProps = {
    name?: string;
};

declare global {
    interface Window {
        __skyportAppName?: string;
    }
}

function resolveAppName(): string {
    return (
        window.__skyportAppName ||
        document.querySelector('title')?.textContent?.split(' - ').pop() ||
        import.meta.env.VITE_APP_NAME ||
        'Skyport'
    );
}

router.on('navigate', (event) => {
    const appName = (event.detail.page.props as SharedPageProps).name;

    if (typeof appName === 'string' && appName.length > 0) {
        window.__skyportAppName = appName;
    }
});

createInertiaApp({
    title: (title) => {
        const appName = resolveAppName();

        return title ? `${title} - ${appName}` : appName;
    },
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);
        const appName = (props.initialPage.props as SharedPageProps).name;

        if (typeof appName === 'string' && appName.length > 0) {
            window.__skyportAppName = appName;
        }

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

// Global prefetch-on-hover: when the user hovers any internal link,
// prefetch it so navigation feels instant.
if (typeof document !== 'undefined') {
    let hoverTimer: ReturnType<typeof setTimeout> | null = null;
    let lastPrefetched = '';

    document.addEventListener('pointerenter', (event) => {
        const link = (event.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
        if (href === lastPrefetched) return;

        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
            lastPrefetched = href;
            router.prefetch(href, { method: 'get' }, { cacheFor: '30s' });
        }, 65);
    }, { capture: true, passive: true });

    document.addEventListener('pointerleave', () => {
        if (hoverTimer) {
            clearTimeout(hoverTimer);
            hoverTimer = null;
        }
    }, { capture: true, passive: true });
}
