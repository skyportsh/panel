import * as React from 'react';
import { useAppearance } from '@/hooks/use-appearance';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
    const { appearance } = useAppearance();

    return (
        <Sonner
            theme={appearance as ToasterProps['theme']}
            className="toaster group"
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                    '--success-bg': 'var(--popover)',
                    '--success-text': 'var(--popover-foreground)',
                    '--success-border': 'var(--border)',
                    '--error-bg': 'var(--popover)',
                    '--error-text': 'var(--popover-foreground)',
                    '--error-border': 'var(--border)',
                } as React.CSSProperties
            }
            toastOptions={{
                classNames: {
                    toast: 'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl',
                    description: 'group-[.toast]:text-muted-foreground',
                    actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
                    cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
                    success: 'group-[.toaster]:border-border',
                    error: 'group-[.toaster]:border-border',
                },
            }}
            {...props}
        />
    );
}

export { Toaster };
