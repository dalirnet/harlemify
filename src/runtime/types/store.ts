import type { ApiAction } from "./api";

export enum StoreEndpoint {
    GET_RECORD = "getRecord",
    GET_RECORDS = "getRecords",
    POST_RECORD = "postRecord",
    POST_RECORDS = "postRecords",
    PUT_RECORD = "putRecord",
    PUT_RECORDS = "putRecords",
    PATCH_RECORD = "patchRecord",
    PATCH_RECORDS = "patchRecords",
    DELETE_RECORD = "deleteRecord",
    DELETE_RECORDS = "deleteRecords",
}

export enum StoreEndpointStatus {
    IDLE = "idle",
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed",
}

export interface StoreEndpointDefinition {
    action: ApiAction;
    url: string | ((keys: Record<PropertyKey, unknown>) => string);
}

export interface StoreEndpointMemory {
    status: StoreEndpointStatus;
}

export interface StoreSchemaMeta {
    indicator?: boolean;
    actions?: ApiAction[];
}
