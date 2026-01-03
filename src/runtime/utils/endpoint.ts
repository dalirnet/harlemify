import type { BaseState } from "@harlem/core";

import {
    StoreEndpoint,
    StoreEndpointStatus,
    type StoreEndpointDefinition,
} from "../types/store";

export function makeEndpointStatusKey<
    K extends StoreEndpoint,
    S extends StoreEndpointStatus,
>(key: K, status: S): `${K}Is${Capitalize<S>}` {
    return `${key}Is${status.charAt(0).toUpperCase() + status.slice(1)}` as any;
}

export function getEndpoint(
    endpoints:
        | Partial<Record<StoreEndpoint, StoreEndpointDefinition>>
        | undefined,
    key: StoreEndpoint,
) {
    const endpoint = endpoints?.[key];
    if (!endpoint) {
        throw new Error(`Endpoint "${key}" is not configured`);
    }

    return endpoint;
}

export function resolveEndpointUrl<T extends Record<PropertyKey, unknown>>(
    url: string | ((parameters: T) => string),
    parameters: T = {} as T,
) {
    if (typeof url === "function") {
        return url(parameters);
    }

    return url;
}

export function makeEndpointsStatus<T>(
    getter: (name: string, fn: (state: BaseState) => boolean) => T,
) {
    const output = {} as {
        [K in StoreEndpoint as `${K}Is${Capitalize<StoreEndpointStatus>}`]: T;
    };

    for (const key of Object.values(StoreEndpoint)) {
        for (const status of Object.values(StoreEndpointStatus)) {
            const statusKey = makeEndpointStatusKey(key, status);

            output[statusKey] = getter(statusKey, (state) => {
                return state.endpoints[key]?.status === status;
            });
        }
    }

    return output;
}
