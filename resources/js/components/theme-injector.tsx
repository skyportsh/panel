import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';

const fontLinks: Record<string, string> = {
    'IBM Plex Sans':
        'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
    'IBM Plex Mono':
        'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap',
    'JetBrains Mono':
        'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap',
    'Lora':
        'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap',
    'Playfair Display':
        'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap',
    'Ubuntu':
        'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;500;700&display=swap',
    'Ubuntu Mono':
        'https://fonts.googleapis.com/css2?family=Ubuntu+Mono:wght@400;700&display=swap',
    'Plus Jakarta Sans':
        'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap',
};

function ensureFontLoaded(fontName: string) {
    const url = fontLinks[fontName];

    if (!url) {
        return;
    }

    const id = `skyport-font-${fontName.replace(/\s+/g, '-').toLowerCase()}`;

    if (document.getElementById(id)) {
        return;
    }

    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
}

export function ThemeInjector() {
    const themeCSS = (usePage().props as { themeCSS?: string | null }).themeCSS;

    useEffect(() => {
        const id = 'skyport-theme';
        let style = document.getElementById(id) as HTMLStyleElement | null;

        if (!themeCSS) {
            style?.remove();
            return;
        }

        if (!style) {
            style = document.createElement('style');
            style.id = id;
            document.head.appendChild(style);
        }

        style.textContent = themeCSS;

        // Load any Google Fonts referenced in the CSS.
        for (const fontName of Object.keys(fontLinks)) {
            if (themeCSS.includes(fontName)) {
                ensureFontLoaded(fontName);
            }
        }
    }, [themeCSS]);

    return null;
}
