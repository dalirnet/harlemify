import { z } from "zod";
import { defu } from "defu";
import {
    createStore as createHarlemStore,
    type Extension,
    type BaseState,
} from "@harlem/core";

import {
    ApiAction,
    type ApiActionOptions,
    type ApiOptions,
} from "../types/api";
import {
    StoreEndpoint,
    StoreEndpointStatus,
    type StoreEndpointDefinition,
    type StoreEndpointMemory,
} from "../types/store";

import { createApi } from "./api";
import { resolveSchema } from "../utils/schema";
import {
    makeEndpointStatusKey,
    getEndpoint,
    resolveEndpointUrl,
    makeEndpointsStatus,
} from "../utils/endpoint";

export function createStore<T extends z.ZodRawShape>(
    name: string,
    schema: z.ZodObject<T>,
    endpoints?: Partial<Record<StoreEndpoint, StoreEndpointDefinition>>,
    options?: {
        api?: ApiOptions;
        extensions?: Extension<BaseState>[];
    },
) {
    const config = useRuntimeConfig();

    const api = createApi({
        ...config.public.harlemify.api,
        ...options?.api,
    });

    const { schema: schemaType, indicator } = resolveSchema(schema);

    type Schema = typeof schemaType;
    type SchemaIndicator = { [indicator]: keyof Schema };

    const store = createHarlemStore(
        name,
        {
            cache: {
                record: null as Schema | null,
                records: [] as Schema[],
            },
            endpoints: {} as Record<StoreEndpoint, StoreEndpointMemory>,
        },
        {
            extensions: options?.extensions ?? [],
        },
    );

    const cachedRecord = store.getter("cachedRecord", (state) => {
        return state.cache.record;
    });

    const cachedRecords = store.getter("cachedRecords", (state) => {
        return state.cache.records;
    });

    function hasCachedRecords(
        ...records: (SchemaIndicator & Partial<Schema>)[]
    ) {
        const output = {} as Record<keyof Schema, boolean>;

        for (const record of records) {
            const exists = cachedRecords.value.some((cachedRecord: any) => {
                return cachedRecord[indicator] === record[indicator];
            });

            output[record[indicator]] = exists;
        }

        return output;
    }

    const putCachedRecord = store.mutation(
        "putCachedRecord",
        (state, record: Schema) => {
            state.cache.record = record;
        },
    );

    const putCachedRecords = store.mutation(
        "putCachedRecords",
        (state, records: Schema[]) => {
            state.cache.records = records;
        },
    );

    const patchCachedRecord = store.mutation(
        "patchCachedRecord",
        (state, record: SchemaIndicator & Partial<Schema>) => {
            state.cache.record = defu<any, any>(record, state.cache.record);
        },
    );

    const patchCachedRecords = store.mutation(
        "patchCachedRecords",
        (state, ...records: (SchemaIndicator & Partial<Schema>)[]) => {
            for (const record of records) {
                const index = state.cache.records.findIndex((cachedRecord) => {
                    return cachedRecord[indicator] === record[indicator];
                });

                if (index !== -1) {
                    state.cache.records[index] = defu<any, any>(
                        record,
                        state.cache.records[index],
                    );
                }
            }
        },
    );

    const pushCachedRecords = store.mutation(
        "pushCachedRecords",
        (state, ...records: Schema[]) => {
            state.cache.records.push(...records);
        },
    );

    const pullCachedRecords = store.mutation(
        "pullCachedRecords",
        (state, ...records: (SchemaIndicator & Partial<Schema>)[]) => {
            state.cache.records = state.cache.records.filter((cachedRecord) => {
                for (const record of records) {
                    if (cachedRecord[indicator] === record[indicator]) {
                        return false;
                    }
                }

                return true;
            });
        },
    );

    const purgeCachedRecord = store.mutation("purgeCachedRecord", (state) => {
        state.cache.record = null;
    });

    const purgeCachedRecords = store.mutation("purgeCachedRecords", (state) => {
        state.cache.records = [];
    });

    const endpointsStatus = makeEndpointsStatus(store.getter);

    const patchEndpointMemory = store.mutation(
        "patchEndpointMemory",
        (
            state,
            {
                key,
                memory,
            }: {
                key: StoreEndpoint;
                memory: StoreEndpointMemory;
            },
        ) => {
            state.endpoints[key] = memory;
        },
    );

    const purgeEndpointMemory = store.mutation(
        "purgeEndpointMemory",
        (state) => {
            state.endpoints = {} as Record<StoreEndpoint, StoreEndpointMemory>;
        },
    );

    function patchEndpointMemoryTo(
        key: StoreEndpoint,
        memory: StoreEndpointMemory,
    ) {
        if (memory.status === StoreEndpointStatus.PENDING) {
            const statusKey = makeEndpointStatusKey(
                key,
                StoreEndpointStatus.PENDING,
            );

            if (endpointsStatus[statusKey].value) {
                throw new Error(`Endpoint "${key}" is already pending`);
            }
        }

        patchEndpointMemory({
            key,
            memory,
        });
    }

    async function getRecord(
        record: SchemaIndicator & Partial<Schema>,
        options?: Omit<ApiActionOptions<ApiAction.GET>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, StoreEndpoint.GET_RECORD);

        patchEndpointMemoryTo(StoreEndpoint.GET_RECORD, {
            status: StoreEndpointStatus.PENDING,
        });

        try {
            const resolvedUrl = resolveEndpointUrl(endpoint.url, {
                [indicator]: record[indicator],
            });

            const response = await api.get<Schema>(resolvedUrl, options);

            putCachedRecord(response);

            patchEndpointMemoryTo(StoreEndpoint.GET_RECORD, {
                status: StoreEndpointStatus.SUCCESS,
            });

            return response;
        } catch (error) {
            patchEndpointMemoryTo(StoreEndpoint.GET_RECORD, {
                status: StoreEndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function getRecords(
        options?: Omit<ApiActionOptions<ApiAction.GET>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, StoreEndpoint.GET_RECORDS);

        patchEndpointMemoryTo(StoreEndpoint.GET_RECORDS, {
            status: StoreEndpointStatus.PENDING,
        });

        try {
            const resolvedUrl = resolveEndpointUrl(endpoint.url);

            const response = await api.get<Schema[]>(resolvedUrl, options);

            putCachedRecords(response);

            patchEndpointMemoryTo(StoreEndpoint.GET_RECORDS, {
                status: StoreEndpointStatus.SUCCESS,
            });

            return response;
        } catch (error) {
            patchEndpointMemoryTo(StoreEndpoint.GET_RECORDS, {
                status: StoreEndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function postRecord(
        record: Schema,
        options?: ApiActionOptions<ApiAction.POST>,
    ) {
        const endpoint = getEndpoint(endpoints, StoreEndpoint.POST_RECORD);

        patchEndpointMemoryTo(StoreEndpoint.POST_RECORD, {
            status: StoreEndpointStatus.PENDING,
        });

        try {
            const resolvedUrl = resolveEndpointUrl(endpoint.url, {
                [indicator]: record[indicator],
            });

            const { values } = resolveSchema(schema, endpoint.action, record);

            const response = await api.post<Schema>(resolvedUrl, {
                ...options,
                body: options?.body ?? values,
            });

            putCachedRecord(response);

            patchEndpointMemoryTo(StoreEndpoint.POST_RECORD, {
                status: StoreEndpointStatus.SUCCESS,
            });

            return response;
        } catch (error) {
            patchEndpointMemoryTo(StoreEndpoint.POST_RECORD, {
                status: StoreEndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function putRecord(
        record: Schema,
        options?: ApiActionOptions<ApiAction.PUT>,
    ) {
        const endpoint = getEndpoint(endpoints, StoreEndpoint.PUT_RECORD);

        patchEndpointMemoryTo(StoreEndpoint.PUT_RECORD, {
            status: StoreEndpointStatus.PENDING,
        });

        try {
            const resolvedUrl = resolveEndpointUrl(endpoint.url, {
                [indicator]: record[indicator],
            });

            const { values } = resolveSchema(schema, endpoint.action, record);

            const response = await api.put<Schema>(resolvedUrl, {
                ...options,
                body: options?.body ?? values,
            });

            putCachedRecord(response);

            patchEndpointMemoryTo(StoreEndpoint.PUT_RECORD, {
                status: StoreEndpointStatus.SUCCESS,
            });

            return response;
        } catch (error) {
            patchEndpointMemoryTo(StoreEndpoint.PUT_RECORD, {
                status: StoreEndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function patchRecord(
        record: SchemaIndicator & Partial<Schema>,
        options?: ApiActionOptions<ApiAction.PATCH>,
    ) {
        const endpoint = getEndpoint(endpoints, StoreEndpoint.PATCH_RECORD);

        patchEndpointMemoryTo(StoreEndpoint.PATCH_RECORD, {
            status: StoreEndpointStatus.PENDING,
        });

        try {
            const resolvedUrl = resolveEndpointUrl(endpoint.url, {
                [indicator]: record[indicator],
            });

            const { values } = resolveSchema(schema, endpoint.action, record);

            const response = await api.patch<SchemaIndicator & Partial<Schema>>(
                resolvedUrl,
                {
                    ...options,
                    body: options?.body ?? values,
                },
            );

            patchCachedRecords(response);

            patchEndpointMemoryTo(StoreEndpoint.PATCH_RECORD, {
                status: StoreEndpointStatus.SUCCESS,
            });

            return response;
        } catch (error) {
            patchEndpointMemoryTo(StoreEndpoint.PATCH_RECORD, {
                status: StoreEndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function deleteRecord(
        record: SchemaIndicator & Partial<Schema>,
        options?: Omit<ApiActionOptions<ApiAction.DELETE>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, StoreEndpoint.DELETE_RECORD);

        patchEndpointMemoryTo(StoreEndpoint.DELETE_RECORD, {
            status: StoreEndpointStatus.PENDING,
        });

        try {
            const resolvedUrl = resolveEndpointUrl(endpoint.url, {
                [indicator]: record[indicator],
            });

            await api.del<typeof record>(resolvedUrl, options);

            pullCachedRecords(record);

            patchEndpointMemoryTo(StoreEndpoint.DELETE_RECORD, {
                status: StoreEndpointStatus.SUCCESS,
            });

            return true;
        } catch (error) {
            patchEndpointMemoryTo(StoreEndpoint.DELETE_RECORD, {
                status: StoreEndpointStatus.FAILED,
            });

            throw error;
        }
    }

    return {
        store,
        cachedRecord,
        cachedRecords,
        hasCachedRecords,
        endpointsStatus,
        putCachedRecord,
        putCachedRecords,
        patchCachedRecord,
        patchCachedRecords,
        pushCachedRecords,
        pullCachedRecords,
        purgeCachedRecord,
        purgeCachedRecords,
        patchEndpointMemory,
        purgeEndpointMemory,
        getRecord,
        getRecords,
        postRecord,
        putRecord,
        patchRecord,
        deleteRecord,
    };
}
