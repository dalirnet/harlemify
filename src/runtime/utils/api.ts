import { toValue } from "vue";

import type { MaybeRefOrGetter } from "vue";

export enum ApiErrorSource {
    REQUEST = "request",
    RESPONSE = "response",
}

export interface ApiErrorOptions {
    source: ApiErrorSource;
    method: string;
    url: string;
    message?: string;
}

export class ApiError extends Error {
    source: ApiErrorSource;
    method: string;
    url: string;
    constructor(options: ApiErrorOptions) {
        super(options.message ?? "Unknown error");

        this.name = "ApiError";
        this.source = options.source;
        this.method = options.method;
        this.url = options.url;
    }
}

export class ApiRequestError extends ApiError {
    constructor(options: Omit<ApiErrorOptions, "source">) {
        super({
            ...options,
            source: ApiErrorSource.REQUEST,
        });
    }
}

export class ApiResponseError extends ApiError {
    constructor(options: Omit<ApiErrorOptions, "source">) {
        super({
            ...options,
            source: ApiErrorSource.RESPONSE,
        });
    }
}

function onRequestError({ request, options, error }: any) {
    throw new ApiRequestError({
        method: options.method as string,
        url: request.toString(),
        message: error?.message,
    });
}

function onResponseError({ request, options, error }: any) {
    throw new ApiResponseError({
        method: options.method as string,
        url: request.toString(),
        message: error?.message,
    });
}

export enum ApiMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    PATCH = "PATCH",
    DELETE = "DELETE",
}

export type ApiEndpoint = string;
export type ApiTimeout = number;
export type ApiHeader = Record<string, string>;
export type ApiQuery = Record<string, unknown>;
export type ApiBody = string | number | ArrayBuffer | FormData | Blob | Record<string, any>;
export type ApiRetry = { count: number | false; delay?: number; statusCodes?: number[] };
export type ApiResponseType = "json" | "text" | "blob" | "arrayBuffer";

export interface ApiOptions {
    endpoint?: ApiEndpoint;
    timeout?: ApiTimeout;
    headers?: ApiHeader;
    query?: ApiQuery;
    retry?: ApiRetry;
}

export interface ApiRequestOptions {
    endpoint?: MaybeRefOrGetter<ApiEndpoint>;
    timeout?: MaybeRefOrGetter<ApiTimeout>;
    headers?: MaybeRefOrGetter<ApiHeader>;
    query?: MaybeRefOrGetter<ApiQuery>;
    body?: MaybeRefOrGetter<ApiBody>;
    responseType?: MaybeRefOrGetter<ApiResponseType>;
    retry?: MaybeRefOrGetter<ApiRetry>;
    signal?: AbortSignal;
}

export interface Api {
    request<T>(url: string, method: ApiMethod, options?: ApiRequestOptions): Promise<T>;
    getRequest<T>(url: string, options?: Omit<ApiRequestOptions, "body">): Promise<T>;
    postRequest<T>(url: string, options?: ApiRequestOptions): Promise<T>;
    putRequest<T>(url: string, options?: ApiRequestOptions): Promise<T>;
    patchRequest<T>(url: string, options?: ApiRequestOptions): Promise<T>;
    deleteRequest<T>(url: string, options?: Omit<ApiRequestOptions, "body">): Promise<T>;
}

export function createApi(options?: ApiOptions): Api {
    async function request<T>(url: string, method: ApiMethod, requestOptions?: ApiRequestOptions): Promise<T> {
        const endpoint = toValue(requestOptions?.endpoint) || options?.endpoint;
        const timeout = toValue(requestOptions?.timeout) || options?.timeout;
        const retry = toValue(requestOptions?.retry) || options?.retry;

        const headers = {
            ...toValue(options?.headers),
            ...toValue(requestOptions?.headers),
        };

        const query = {
            ...toValue(options?.query),
            ...toValue(requestOptions?.query),
        };

        const body: any = toValue(requestOptions?.body);
        const responseType = toValue(requestOptions?.responseType);

        const response = await $fetch(url, {
            baseURL: endpoint,
            method,
            headers,
            query,
            body,
            timeout,
            retry: retry?.count,
            retryDelay: retry?.delay,
            retryStatusCodes: retry?.statusCodes,
            responseType,
            onRequestError,
            onResponseError,
            signal: requestOptions?.signal,
        });

        return response as T;
    }

    function getRequest<T>(url: string, options?: Omit<ApiRequestOptions, "body">): Promise<T> {
        return request<T>(url, ApiMethod.GET, options);
    }

    function postRequest<T>(url: string, options?: ApiRequestOptions): Promise<T> {
        return request<T>(url, ApiMethod.POST, options);
    }

    async function putRequest<T>(url: string, options?: ApiRequestOptions): Promise<T> {
        return request<T>(url, ApiMethod.PUT, options);
    }

    async function patchRequest<T>(url: string, options?: ApiRequestOptions): Promise<T> {
        return request<T>(url, ApiMethod.PATCH, options);
    }

    async function deleteRequest<T>(url: string, options?: Omit<ApiRequestOptions, "body">): Promise<T> {
        return request<T>(url, ApiMethod.DELETE, options);
    }

    return {
        request,
        getRequest,
        postRequest,
        putRequest,
        patchRequest,
        deleteRequest,
    };
}
