import {
    ApiAction,
    ApiErrorSource,
    type ApiRequestHeader,
    type ApiRequestQuery,
    type ApiRequestBody,
    type ApiRequestOptions,
    type ApiOptions,
    type ApiActionOptions,
    type ApiErrorOptions,
} from "../types/api";

export class ApiError extends Error {
    source: ApiErrorSource;
    method: string;
    url: string;

    constructor(options: ApiErrorOptions) {
        super(options.message || "Unknown error");

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

export function createApi(apiOptions?: ApiOptions) {
    async function request<
        T,
        A extends ApiAction = ApiAction,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(
        url: string,
        options?: ApiRequestOptions<A, H, Q, B> & ApiOptions,
    ): Promise<T> {
        return $fetch<T>(url, {
            baseURL: apiOptions?.url,
            method: options?.action ?? ApiAction.GET,
            headers: {
                ...apiOptions?.headers,
                ...options?.headers,
            } as any,
            query: options?.query as any,
            body: options?.body as any,
            timeout: options?.timeout ?? apiOptions?.timeout,
            responseType: options?.responseType,
            retry: options?.retry,
            retryDelay: options?.retryDelay,
            retryStatusCodes: options?.retryStatusCodes,
            onRequestError({ request, options, error }) {
                throw new ApiRequestError({
                    method: options.method as string,
                    url: request.toString(),
                    message: error?.message,
                });
            },
            onResponseError({ request, options, error }) {
                throw new ApiResponseError({
                    method: options.method as string,
                    url: request.toString(),
                    message: error?.message,
                });
            },
        });
    }

    async function get<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
    >(url: string, options?: ApiActionOptions<ApiAction.GET, H, Q, never>) {
        return request<T, ApiAction.GET, H, Q, never>(url, {
            ...options,
            action: ApiAction.GET,
        });
    }

    async function post<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(url: string, options?: ApiActionOptions<ApiAction.POST, H, Q, B>) {
        return request<T, ApiAction.POST, H, Q, B>(url, {
            ...options,
            action: ApiAction.POST,
        });
    }

    async function put<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(url: string, options?: ApiActionOptions<ApiAction.PUT, H, Q, B>) {
        return request<T, ApiAction.PUT, H, Q, B>(url, {
            ...options,
            action: ApiAction.PUT,
        });
    }

    async function patch<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
        B extends ApiRequestBody = ApiRequestBody,
    >(url: string, options?: ApiActionOptions<ApiAction.PATCH, H, Q, B>) {
        return request<T, ApiAction.PATCH, H, Q, B>(url, {
            ...options,
            action: ApiAction.PATCH,
        });
    }

    async function del<
        T,
        H extends ApiRequestHeader = ApiRequestHeader,
        Q extends ApiRequestQuery = ApiRequestQuery,
    >(url: string, options?: ApiActionOptions<ApiAction.DELETE, H, Q, never>) {
        return request<T, ApiAction.DELETE, H, Q, never>(url, {
            ...options,
            action: ApiAction.DELETE,
        });
    }

    return {
        get,
        post,
        put,
        patch,
        del,
    };
}
