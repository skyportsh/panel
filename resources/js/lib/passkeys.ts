type CredentialDescriptorJson = {
    id: string;
    transports?: AuthenticatorTransport[];
    type: PublicKeyCredentialType;
};

type RegistrationOptionsJson = {
    attestation?: AttestationConveyancePreference;
    authenticatorSelection?: AuthenticatorSelectionCriteria;
    challenge: string;
    excludeCredentials?: CredentialDescriptorJson[];
    pubKeyCredParams: PublicKeyCredentialParameters[];
    rp: PublicKeyCredentialRpEntity;
    timeout?: number;
    user: PublicKeyCredentialUserEntity & { id: string };
};

type AuthenticationOptionsJson = {
    allowCredentials?: CredentialDescriptorJson[];
    challenge: string;
    rpId?: string;
    timeout?: number;
    userVerification?: UserVerificationRequirement;
};

type RegistrationOptionsResponse = {
    publicKey: RegistrationOptionsJson;
};

type AuthenticationOptionsResponse = {
    publicKey: AuthenticationOptionsJson;
};

type PasskeyRedirectResponse = {
    redirect: string;
};

type SerializedRegistrationCredential = {
    id: string;
    rawId: string;
    response: {
        attestationObject: string;
        clientDataJSON: string;
        transports: AuthenticatorTransport[];
    };
    type: PublicKeyCredentialType;
};

type SerializedAuthenticationCredential = {
    id: string;
    rawId: string;
    response: {
        authenticatorData: string;
        clientDataJSON: string;
        signature: string;
        userHandle: string | null;
    };
    type: PublicKeyCredentialType;
};

function toUint8Array(buffer: ArrayBuffer | ArrayBufferView): Uint8Array {
    if (buffer instanceof ArrayBuffer) {
        return new Uint8Array(buffer);
    }

    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

function toBase64Url(buffer: ArrayBuffer | ArrayBufferView): string {
    let output = '';

    toUint8Array(buffer).forEach((byte) => {
        output += String.fromCharCode(byte);
    });

    return btoa(output)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function fromBase64Url(value: string): ArrayBuffer {
    const padded = value
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

    return bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
}

function creationOptionsFromJson(
    options: RegistrationOptionsJson,
): CredentialCreationOptions {
    return {
        publicKey: {
            ...options,
            challenge: fromBase64Url(options.challenge),
            excludeCredentials: options.excludeCredentials?.map(
                (credential) => ({
                    ...credential,
                    id: fromBase64Url(credential.id),
                }),
            ),
            user: {
                ...options.user,
                id: fromBase64Url(options.user.id),
            },
        },
    };
}

function requestOptionsFromJson(
    options: AuthenticationOptionsJson,
): CredentialRequestOptions {
    return {
        publicKey: {
            ...options,
            allowCredentials: options.allowCredentials?.map((credential) => ({
                ...credential,
                id: fromBase64Url(credential.id),
            })),
            challenge: fromBase64Url(options.challenge),
        },
    };
}

function serializeRegistrationCredential(
    credential: PublicKeyCredential,
): SerializedRegistrationCredential {
    const response = credential.response as AuthenticatorAttestationResponse;

    return {
        id: credential.id,
        rawId: toBase64Url(credential.rawId),
        response: {
            attestationObject: toBase64Url(response.attestationObject),
            clientDataJSON: toBase64Url(response.clientDataJSON),
            transports: (response.getTransports?.() ??
                []) as AuthenticatorTransport[],
        },
        type: credential.type as PublicKeyCredentialType,
    };
}

function serializeAuthenticationCredential(
    credential: PublicKeyCredential,
): SerializedAuthenticationCredential {
    const response = credential.response as AuthenticatorAssertionResponse;

    return {
        id: credential.id,
        rawId: toBase64Url(credential.rawId),
        response: {
            authenticatorData: toBase64Url(response.authenticatorData),
            clientDataJSON: toBase64Url(response.clientDataJSON),
            signature: toBase64Url(response.signature),
            userHandle: response.userHandle
                ? toBase64Url(response.userHandle)
                : null,
        },
        type: credential.type as PublicKeyCredentialType,
    };
}

function csrfToken(): string {
    const value = document.querySelector<HTMLMetaElement>(
        'meta[name="csrf-token"]',
    )?.content;

    if (!value) {
        throw new Error('Missing CSRF token.');
    }

    return value;
}

async function fetchJson<T>(
    input: RequestInfo,
    init?: RequestInit,
): Promise<T> {
    const response = await fetch(input, {
        ...init,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            ...(init?.body
                ? {
                      'Content-Type': 'application/json',
                      'X-CSRF-TOKEN': csrfToken(),
                  }
                : {}),
            ...(init?.headers ?? {}),
        },
    });

    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = payload.errors
            ? Object.values(payload.errors).flat().join(' ')
            : payload.message;

        throw new Error(
            typeof message === 'string' && message.length > 0
                ? message
                : 'Passkey request failed.',
        );
    }

    return response.json() as Promise<T>;
}

export function passkeysAreSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'PublicKeyCredential' in window &&
        typeof navigator.credentials !== 'undefined'
    );
}

export async function conditionalMediationAvailable(): Promise<boolean> {
    if (!passkeysAreSupported()) {
        return false;
    }

    const conditionalCheck = (
        window.PublicKeyCredential as typeof PublicKeyCredential & {
            isConditionalMediationAvailable?: () => Promise<boolean>;
        }
    ).isConditionalMediationAvailable;

    if (typeof conditionalCheck !== 'function') {
        return false;
    }

    return conditionalCheck.call(window.PublicKeyCredential);
}

export async function registerPasskey(
    optionsUrl: string,
    storeUrl: string,
    name?: string,
): Promise<void> {
    const { publicKey } =
        await fetchJson<RegistrationOptionsResponse>(optionsUrl);
    const credential = await navigator.credentials.create(
        creationOptionsFromJson(publicKey),
    );

    if (!(credential instanceof PublicKeyCredential)) {
        throw new Error('The browser did not return a passkey credential.');
    }

    await fetchJson(storeUrl, {
        body: JSON.stringify({
            credential: serializeRegistrationCredential(credential),
            name,
        }),
        method: 'POST',
    });
}

export async function authenticateWithPasskey(
    optionsUrl: string,
    storeUrl: string,
    remember: boolean,
    conditional: boolean,
    signal?: AbortSignal,
): Promise<string | null> {
    const { publicKey } =
        await fetchJson<AuthenticationOptionsResponse>(optionsUrl);
    const requestOptions = requestOptionsFromJson(publicKey);

    const credential = await navigator.credentials.get({
        ...(conditional
            ? { mediation: 'conditional' as CredentialMediationRequirement }
            : {}),
        ...requestOptions,
        signal,
    });

    if (!(credential instanceof PublicKeyCredential)) {
        return null;
    }

    const { redirect } = await fetchJson<PasskeyRedirectResponse>(storeUrl, {
        body: JSON.stringify({
            credential: serializeAuthenticationCredential(credential),
            remember,
        }),
        method: 'POST',
    });

    return redirect;
}

export function passkeyAutocomplete(): string {
    return 'username webauthn';
}
