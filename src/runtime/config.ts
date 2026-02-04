import type { ApiFetchAdapterOptions } from "./utils/adapter";

export type RuntimeConfig = {
    api?: {
        headers?: Record<string, string>;
        query?: Record<string, unknown>;
        adapter?: ApiFetchAdapterOptions;
    };
};

export const runtimeConfig: RuntimeConfig = {
    api: {},
};
