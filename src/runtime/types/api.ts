export enum ApiAction {
    GET = "get",
    POST = "post",
    PUT = "put",
    PATCH = "patch",
    DELETE = "delete",
}

export enum ApiResponseType {
    JSON = "json",
    TEXT = "text",
    BLOB = "blob",
    ARRAY_BUFFER = "arrayBuffer",
}

export enum ApiErrorSource {
    REQUEST = "request",
    RESPONSE = "response",
}

export type ApiRequestHeader = Record<string, unknown>;
export type ApiRequestQuery = Record<string, unknown>;
export type ApiRequestBody =
    | string
    | number
    | ArrayBuffer
    | FormData
    | Blob
    | Record<string, any>;

export interface ApiRequestOptions<
    A extends ApiAction = ApiAction,
    H extends ApiRequestHeader = ApiRequestHeader,
    Q extends ApiRequestQuery = ApiRequestQuery,
    B extends ApiRequestBody = ApiRequestBody,
> {
    action?: A;
    headers?: H;
    query?: Q;
    body?: B;
    responseType?: ApiResponseType;
    retry?: number | false;
    retryDelay?: number;
    retryStatusCodes?: number[];
}

export interface ApiOptions {
    url?: string;
    timeout?: number;
    headers?: ApiRequestHeader;
}

export type ApiActionOptions<
    A extends ApiAction,
    H extends ApiRequestHeader = ApiRequestHeader,
    Q extends ApiRequestQuery = ApiRequestQuery,
    B extends ApiRequestBody = ApiRequestBody,
> = Omit<ApiRequestOptions<A, H, Q, B>, "action">;

export interface ApiErrorOptions {
    source: ApiErrorSource;
    method: string;
    url: string;
    message?: string;
}
