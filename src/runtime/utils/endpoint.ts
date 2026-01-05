import type { BaseState } from "@harlem/core";

import type { ApiAction } from "../core/api";

export enum Endpoint {
    GET_UNIT = "getUnit",
    GET_UNITS = "getUnits",
    POST_UNIT = "postUnit",
    POST_UNITS = "postUnits",
    PUT_UNIT = "putUnit",
    PUT_UNITS = "putUnits",
    PATCH_UNIT = "patchUnit",
    PATCH_UNITS = "patchUnits",
    DELETE_UNIT = "deleteUnit",
    DELETE_UNITS = "deleteUnits",
}

export enum EndpointStatus {
    IDLE = "idle",
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed",
}

export interface EndpointDefinition<T = Record<string, unknown>> {
    action: ApiAction;
    url: string | ((params: T) => string);
}

export interface EndpointMemory {
    status: EndpointStatus;
}

type CapitalizeString<S extends string> = S extends `${infer F}${infer R}`
    ? `${Uppercase<F>}${R}`
    : S;

export type EndpointStatusKey<
    K extends Endpoint = Endpoint,
    S extends EndpointStatus = EndpointStatus,
> = `${K}Is${CapitalizeString<S>}`;

export function makeEndpointStatusKey<
    K extends Endpoint,
    S extends EndpointStatus,
>(key: K, status: S): EndpointStatusKey<K, S> {
    const capitalizedStatus = (status.charAt(0).toUpperCase() +
        status.slice(1)) as CapitalizeString<S>;
    return `${key}Is${capitalizedStatus}` as EndpointStatusKey<K, S>;
}

export function getEndpoint<T = Record<string, unknown>>(
    endpoints: Partial<Record<Endpoint, EndpointDefinition<T>>> | undefined,
    key: Endpoint,
) {
    const endpoint = endpoints?.[key];
    if (!endpoint) {
        throw new Error(`Endpoint "${key}" is not configured`);
    }

    return endpoint;
}

export function resolveEndpointUrl<T>(
    endpoint: EndpointDefinition<T>,
    params?: { [key: string]: unknown },
) {
    if (typeof endpoint.url === "function") {
        return endpoint.url(params as T);
    }

    return endpoint.url;
}

export type EndpointsStatusMap<T> = {
    [K in Endpoint as EndpointStatusKey<K, EndpointStatus>]: T;
};

export function makeEndpointsStatus<T>(
    getter: (name: string, fn: (state: BaseState) => boolean) => T,
): EndpointsStatusMap<T> {
    const output = {} as EndpointsStatusMap<T>;

    for (const key of Object.values(Endpoint)) {
        for (const status of Object.values(EndpointStatus)) {
            const statusKey = makeEndpointStatusKey(key, status);

            output[statusKey] = getter(statusKey, (state) => {
                return state.endpoints[key]?.status === status;
            });
        }
    }

    return output;
}
