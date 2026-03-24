import { cn } from '@/lib/utils';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
    return (
        <svg
            role="status"
            aria-label="Loading"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('size-4', className)}
            {...props}
        >
            {Array.from({ length: 12 }, (_, i) => {
                const angle = i * 30;
                const opacity = (i + 1) / 12;
                const delay = `${-((12 - i) / 12).toFixed(3)}s`;
                const rad = (angle * Math.PI) / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);
                const x1 = (12 + 5 * sin).toFixed(3);
                const y1 = (12 - 5 * cos).toFixed(3);
                const x2 = (12 + 8.5 * sin).toFixed(3);
                const y2 = (12 - 8.5 * cos).toFixed(3);
                return (
                    <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        style={{
                            animationDelay: delay,
                            animationDuration: '1s',
                            animationName: 'spinner-fade',
                            animationTimingFunction: 'linear',
                            animationIterationCount: 'infinite',
                            opacity,
                        }}
                    />
                );
            })}
        </svg>
    );
}

export { Spinner };
