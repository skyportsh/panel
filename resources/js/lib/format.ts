export function formatDate(value: string | null, withTime = false): string {
    if (!value) {
        return '—';
    }

    return new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'medium',
        ...(withTime ? { timeStyle: 'short' } : {}),
    }).format(new Date(value));
}

export function formatRelativeTime(value: string | null): string {
    if (!value) {
        return '—';
    }

    const now = Date.now();
    const then = new Date(value).getTime();
    const seconds = Math.round((now - then) / 1000);

    if (seconds < 60) {
        return 'just now';
    }

    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.round(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.round(hours / 24);
    if (days < 30) {
        return `${days}d ago`;
    }

    const months = Math.round(days / 30);
    if (months < 12) {
        return `${months}mo ago`;
    }

    const years = Math.round(months / 12);
    return `${years}y ago`;
}
