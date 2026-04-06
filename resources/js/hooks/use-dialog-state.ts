import { useEffect, useRef, useState } from 'react';
import { useCallback, useMemo } from 'react';

const DEFAULT_CLOSE_DELAY_MS = 220;

export function useDialogState<T>(closeDelayMs = DEFAULT_CLOSE_DELAY_MS) {
    const [payload, setPayload] = useState<T | null>(null);
    const [open, setOpen] = useState(false);
    const closeTimeoutRef = useRef<number | null>(null);

    const clearCloseTimeout = useCallback(() => {
        if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    }, []);

    const show = useCallback(
        (nextPayload: T) => {
            clearCloseTimeout();
            setPayload(nextPayload);
            setOpen(true);
        },
        [clearCloseTimeout],
    );

    const hide = useCallback(() => {
        setOpen(false);
        clearCloseTimeout();
        closeTimeoutRef.current = window.setTimeout(() => {
            setPayload(null);
            closeTimeoutRef.current = null;
        }, closeDelayMs);
    }, [clearCloseTimeout, closeDelayMs]);

    useEffect(() => clearCloseTimeout, [clearCloseTimeout]);

    return useMemo(
        () => ({
            payload,
            open,
            show,
            hide,
            setPayload,
        }),
        [payload, open, show, hide],
    );
}
