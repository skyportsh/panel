import { useEffect, useState } from 'react';

type Phase = 'logo' | 'text' | 'exit';

export function WelcomeOverlay({
    name,
    onDone,
}: {
    name: string;
    onDone: () => void;
}) {
    // Start at 'logo' — the blur overlay was already applied by the login page
    const [phase, setPhase] = useState<Phase>('logo');

    useEffect(() => {
        const timers = [
            setTimeout(() => setPhase('text'), 1800),
            setTimeout(() => setPhase('exit'), 3200),
            setTimeout(onDone, 4400),
        ];

        return () => timers.forEach(clearTimeout);
    }, [onDone]);

    const isText = phase === 'text' || phase === 'exit';
    const isExit = phase === 'exit';

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                // Already blurred — match exactly what login page left behind
                backdropFilter: 'blur(10px)',
                backgroundColor: 'rgba(0,0,0,0.35)',
                transition: 'opacity 1.2s ease',
                opacity: isExit ? 0 : 1,
                overflow: 'hidden',
            }}
        >
            {/* Logo — simple fade in, no zoom */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    animation: 'welcome-logo-in 1s ease both',
                    filter: isText ? 'blur(12px)' : 'blur(0px)',
                    opacity: isText ? 0 : 1,
                    transition: 'filter 1s ease, opacity 1s ease',
                }}
            >
                <img
                    src="https://i.ibb.co/dwfZ7Mc0/ETHER-2026-03-18-T170407-214.png"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                    }}
                    className="invert dark:invert-0"
                    alt="Logo"
                />
            </div>

            {/* Welcome text */}
            <div
                style={{
                    position: 'absolute',
                    zIndex: 2,
                    textAlign: 'center',
                    transition: 'opacity 1s ease, transform 1s ease',
                    opacity: isText ? 1 : 0,
                    transform: isText ? 'translateY(0px)' : 'translateY(10px)',
                    pointerEvents: 'none',
                }}
            >
                <p
                    style={{
                        color: '#fff',
                        fontSize: 18,
                        fontWeight: 500,
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                        textShadow: '0 0 40px rgba(255,255,255,0.25)',
                    }}
                >
                    Welcome back, {name}
                </p>
            </div>
        </div>
    );
}
