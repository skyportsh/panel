import { useId } from 'react';

interface PlaceholderPatternProps {
    className?: string;
    patternSize?: number;
}

export function PlaceholderPattern({ className, patternSize = 10 }: PlaceholderPatternProps) {
    const patternId = useId();
    const scale = patternSize / 10;

    return (
        <svg className={className} fill="none">
            <defs>
                <pattern id={patternId} x="0" y="0" width={patternSize} height={patternSize} patternUnits="userSpaceOnUse">
                    <g transform={scale !== 1 ? `scale(${scale})` : undefined}>
                        <path d="M-3 13 15-5M-5 5l18-18M-1 21 17 3"></path>
                    </g>
                </pattern>
            </defs>
            <rect stroke="none" fill={`url(#${patternId})`} width="100%" height="100%"></rect>
        </svg>
    );
}
