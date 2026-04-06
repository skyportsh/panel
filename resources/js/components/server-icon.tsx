import type { SVGProps } from 'react';

export default function ServerIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            <rect
                x="3"
                y="4"
                width="18"
                height="6"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <rect
                x="3"
                y="14"
                width="18"
                height="6"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
            />
            <path
                d="M7 7H7.01M7 17H7.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M11 7H17M11 17H17"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    );
}
