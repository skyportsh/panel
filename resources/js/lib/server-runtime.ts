export type ServerRuntimeState =
    | 'install_failed'
    | 'installing'
    | 'offline'
    | 'pending'
    | 'restarting'
    | 'running'
    | 'starting'
    | 'stopping'
    | (string & {});

export type ServerPowerAvailability = {
    start: boolean;
    stop: boolean;
    restart: boolean;
    kill: boolean;
    reinstall: boolean;
};

type AllocationLike = {
    bind_ip: string;
    ip_alias: string | null;
    port: number;
};

export function formatServerAddress(server: {
    allocation: AllocationLike;
}): string;
export function formatServerAddress(allocation: AllocationLike): string;
export function formatServerAddress(
    input: { allocation: AllocationLike } | AllocationLike,
): string {
    const allocation = 'allocation' in input ? input.allocation : input;

    return `${allocation.ip_alias ?? allocation.bind_ip}:${allocation.port}`;
}

export function statusTone(status: string): string {
    switch (status) {
        case 'running':
            return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
        case 'starting':
        case 'installing':
        case 'stopping':
        case 'restarting':
            return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
        case 'install_failed':
            return 'bg-[#d92400]/12 text-[#d92400] dark:text-[#ff8a6b]';
        case 'pending':
            return 'bg-sky-500/10 text-sky-700 dark:text-sky-400';
        default:
            return 'bg-muted text-muted-foreground';
    }
}

export function statusLabel(status: string): string {
    switch (status) {
        case 'running':
            return 'Running';
        case 'starting':
            return 'Starting';
        case 'stopping':
            return 'Stopping';
        case 'restarting':
            return 'Restarting';
        case 'installing':
            return 'Installing';
        case 'install_failed':
            return 'Install failed';
        case 'pending':
            return 'Pending';
        default:
            return 'Offline';
    }
}

export function powerActionsForState(
    status: string,
): ServerPowerAvailability {
    switch (status) {
        case 'offline':
        case 'install_failed':
            return {
                start: true,
                stop: false,
                restart: false,
                kill: false,
                reinstall: true,
            };
        case 'running':
            return {
                start: false,
                stop: true,
                restart: true,
                kill: false,
                reinstall: true,
            };
        case 'starting':
        case 'stopping':
        case 'restarting':
            return {
                start: false,
                stop: false,
                restart: false,
                kill: true,
                reinstall: true,
            };
        case 'pending':
        case 'installing':
            return {
                start: false,
                stop: false,
                restart: false,
                kill: false,
                reinstall: true,
            };
        default:
            return {
                start: false,
                stop: false,
                restart: false,
                kill: false,
                reinstall: false,
            };
    }
}
