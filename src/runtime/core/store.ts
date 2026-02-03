import { defu } from "defu";
import { createStore as createHarlemStore } from "@harlem/core";

import type { z } from "zod";
import type { ComputedRef } from "vue";
import type { Extension, BaseState } from "@harlem/core";

import { createApi } from "./api";
import { sharedConfig } from "../shared";
import { createCache } from "../utils/cache";
import { defineApiAdapter } from "../utils/adapter";
import { pluralize } from "../utils/transform";
import { resolveSchema } from "../utils/schema";
import { EndpointMethod, EndpointStatus, resolveEndpointUrl } from "../utils/endpoint";

import type { Api } from "./api";
import type { ApiAdapter } from "../utils/adapter";
import type { Pluralize } from "../utils/transform";
import type { EndpointDefinition } from "../utils/endpoint";
import type { MemoryDefinition, MemoryMutation } from "../utils/memory";

export interface ActionDefinition<S = Record<string, unknown>> {
    endpoint: EndpointDefinition<S>;
    memory?: MemoryDefinition;
}

export interface ActionOptions {
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
    body?: unknown;
    signal?: AbortSignal;
    validate?: boolean;
    adapter?: ApiAdapter<any>;
}

export interface ActionStatus {
    current: () => EndpointStatus;
    pending: () => boolean;
    success: () => boolean;
    failed: () => boolean;
    idle: () => boolean;
}

export interface StoreHooks {
    before?: () => Promise<void> | void;
    after?: (error?: Error) => Promise<void> | void;
}

export interface StoreOptions<_A extends ActionsConfig<any> = ActionsConfig<any>> {
    adapter?: ApiAdapter<any>;
    indicator?: string;
    hooks?: StoreHooks;
    extensions?: Extension<BaseState>[];
}

export type ActionsConfig<S = Record<string, unknown>> = Record<string, ActionDefinition<S>>;

export type ActionFunction<S> = (params?: Partial<S>, options?: ActionOptions) => Promise<S | S[] | boolean>;

export type StoreActions<A extends ActionsConfig<S>, S> = {
    [K in keyof A]: ActionFunction<S>;
};

export type StoreMonitor<A extends ActionsConfig<any>> = {
    [K in keyof A]: ActionStatus;
};

export type StoreMemory<T, I extends keyof T> = {
    set: (data: T | T[] | null) => void;
    edit: (data: PartialWithIndicator<T, I> | PartialWithIndicator<T, I>[], options?: { deep?: boolean }) => void;
    drop: (data: PartialWithIndicator<T, I> | PartialWithIndicator<T, I>[]) => void;
};

export type Store<
    E extends string = string,
    S = unknown,
    I extends keyof S = keyof S,
    A extends ActionsConfig<S> = ActionsConfig<S>,
> = {
    store: any;
    alias: {
        unit: E;
        units: Pluralize<E>;
    };
    indicator: I;
    unit: ComputedRef<S | null>;
    units: ComputedRef<S[]>;
    action: StoreActions<A, S>;
    memory: StoreMemory<S, I>;
    monitor: StoreMonitor<A>;
};

type Indicator<T, I extends keyof T> = Required<Pick<T, I>>;
type PartialWithIndicator<T, I extends keyof T> = Indicator<T, I> & Partial<T>;

type StoreState<S> = {
    memory: {
        unit: S | null;
        units: S[];
    };
    status: Record<string, EndpointStatus>;
};

function getDefaultMutation(method: EndpointMethod, target: "unit" | "units"): MemoryMutation {
    const defaults: Record<EndpointMethod, { unit: MemoryMutation; units: MemoryMutation }> = {
        [EndpointMethod.GET]: {
            unit: "set",
            units: "set",
        },
        [EndpointMethod.POST]: {
            unit: "set",
            units: "add",
        },
        [EndpointMethod.PUT]: {
            unit: "set",
            units: "edit",
        },
        [EndpointMethod.PATCH]: {
            unit: "edit",
            units: "edit",
        },
        [EndpointMethod.DELETE]: {
            unit: "drop",
            units: "drop",
        },
    };

    return defaults[method][target];
}

function setNestedValue(object: any, path: string[], value: any): void {
    if (path.length === 0) {
        return;
    }

    let current = object;

    for (let index = 0; index < path.length - 1; index++) {
        if (current[path[index]] === undefined) {
            current[path[index]] = {};
        }

        current = current[path[index]];
    }

    current[path[path.length - 1]] = value;
}

function editNestedValue(object: any, path: string[], value: any, deep?: boolean): void {
    if (path.length === 0) {
        return;
    }

    let current = object;

    for (let index = 0; index < path.length - 1; index++) {
        if (current[path[index]] === undefined) {
            return;
        }

        current = current[path[index]];
    }

    const key = path[path.length - 1];

    if (current[key] === undefined) {
        current[key] = value;

        return;
    }

    if (deep) {
        current[key] = defu(value, current[key]);

        return;
    }

    Object.assign(current[key], value);
}

export function createStore<
    E extends string,
    T extends z.ZodRawShape,
    A extends ActionsConfig<z.infer<z.ZodObject<T>>>,
    S extends z.infer<z.ZodObject<T>> = z.infer<z.ZodObject<T>>,
    I extends keyof S = "id" & keyof S,
>(entity: E, schema: z.ZodObject<T>, actions: A, options?: StoreOptions<A>): Store<E, S, I, A> {
    const resolvedSchema = resolveSchema(schema, {
        indicator: options?.indicator as keyof S,
    });

    const indicator = resolvedSchema.indicator;

    const indexCache = createCache<unknown, number>();
    const schemaCache = createCache<
        string,
        {
            keys: Record<keyof S, true>;
            fields: (keyof S)[];
        }
    >();

    for (const actionName in actions) {
        const actionSchema = resolveSchema(schema, {
            indicator,
            action: actionName,
        });

        schemaCache.set(actionName, {
            keys: actionSchema.keys,
            fields: Object.keys(actionSchema.keys) as (keyof S)[],
        });
    }

    let apiClient: Api;

    function api(): Api {
        if (!apiClient) {
            apiClient = createApi({
                headers: sharedConfig.api?.headers,
                query: sharedConfig.api?.query,
                adapter: options?.adapter ?? defineApiAdapter(sharedConfig.api?.adapter),
            });
        }

        return apiClient;
    }

    const state: StoreState<S> = {
        memory: {
            unit: null,
            units: [],
        },
        status: {},
    };

    for (const actionName in actions) {
        state.status[actionName] = EndpointStatus.IDLE;
    }

    const store = createHarlemStore(entity, state, {
        extensions: options?.extensions ?? [],
    });

    const alias = {
        unit: entity,
        units: pluralize(entity),
    };

    const memorizedUnit = store.getter("memorizedUnit", (state: any) => {
        return state.memory.unit as S | null;
    });

    const memorizedUnits = store.getter("memorizedUnits", (state: any) => {
        return state.memory.units as S[];
    });

    const setMemorizedUnit = store.mutation("setMemorizedUnit", (state: any, unit: S | null = null) => {
        state.memory.unit = unit;
    });

    const setMemorizedUnits = store.mutation("setMemorizedUnits", (state: any, units: S[] = []) => {
        state.memory.units = units;

        indexCache.clear();

        if (units && Array.isArray(units)) {
            for (let index = 0; index < units.length; index++) {
                if (units[index]) {
                    indexCache.set(units[index][indicator], index);
                }
            }
        }
    });

    const editMemorizedUnit = store.mutation(
        "editMemorizedUnit",
        (state: any, payload: { unit: PartialWithIndicator<S, I>; deep?: boolean }) => {
            if (state.memory.unit?.[indicator] !== payload.unit[indicator]) {
                return;
            }

            if (payload.deep) {
                state.memory.unit = defu<any, any>(payload.unit, state.memory.unit);

                return;
            }

            Object.assign(state.memory.unit, payload.unit);
        },
    );

    const editMemorizedUnits = store.mutation(
        "editMemorizedUnits",
        (state: any, payload: { units: PartialWithIndicator<S, I>[]; deep?: boolean }) => {
            const tempIndex = new Map<unknown, number>();

            for (let index = 0; index < state.memory.units.length; index++) {
                tempIndex.set(state.memory.units[index][indicator], index);
            }

            for (const unit of payload.units) {
                let unitIndex = indexCache.get(unit[indicator]);

                if (
                    unitIndex === undefined ||
                    unitIndex >= state.memory.units.length ||
                    state.memory.units[unitIndex]?.[indicator] !== unit[indicator]
                ) {
                    const foundIndex = tempIndex.get(unit[indicator]);

                    if (foundIndex !== undefined) {
                        unitIndex = foundIndex;
                        indexCache.set(unit[indicator], foundIndex);
                    } else {
                        unitIndex = undefined;
                    }
                }

                if (unitIndex === undefined) {
                    continue;
                }

                if (payload.deep) {
                    state.memory.units[unitIndex] = defu<any, any>(unit, state.memory.units[unitIndex]);

                    continue;
                }

                Object.assign(state.memory.units[unitIndex], unit);
            }
        },
    );

    const dropMemorizedUnit = store.mutation("dropMemorizedUnit", (state: any, unit: PartialWithIndicator<S, I>) => {
        if (state.memory.unit?.[indicator] === unit[indicator]) {
            state.memory.unit = null;
        }
    });

    const dropMemorizedUnits = store.mutation(
        "dropMemorizedUnits",
        (state: any, units: PartialWithIndicator<S, I>[]) => {
            const dropSet = new Set(
                units.map((unit) => {
                    return unit[indicator];
                }),
            );

            for (const unit of units) {
                indexCache.delete(unit[indicator]);
            }

            state.memory.units = state.memory.units.filter((memorizedUnit: S) => {
                return !dropSet.has((memorizedUnit as any)[indicator]);
            });
        },
    );

    const addMemorizedUnits = store.mutation(
        "addMemorizedUnits",
        (state: any, payload: { units: S[]; prepend?: boolean }) => {
            if (payload.prepend) {
                indexCache.clear();

                for (let index = 0; index < payload.units.length; index++) {
                    indexCache.set(payload.units[index][indicator], index);
                }

                for (let index = 0; index < state.memory.units.length; index++) {
                    indexCache.set((state.memory.units[index] as S)[indicator], index + payload.units.length);
                }

                state.memory.units = [...payload.units, ...state.memory.units];

                return;
            }

            for (let index = 0; index < payload.units.length; index++) {
                indexCache.set(payload.units[index][indicator], state.memory.units.length + index);
            }

            state.memory.units = [...state.memory.units, ...payload.units];
        },
    );

    const setNestedUnit = store.mutation("setNestedUnit", (state: any, payload: { path: string[]; value: any }) => {
        if (!state.memory.unit) {
            return;
        }

        setNestedValue(state.memory.unit, payload.path, payload.value);
    });

    const editNestedUnit = store.mutation(
        "editNestedUnit",
        (state: any, payload: { path: string[]; value: any; deep?: boolean }) => {
            if (!state.memory.unit) {
                return;
            }

            editNestedValue(state.memory.unit, payload.path, payload.value, payload.deep);
        },
    );

    const dropNestedUnit = store.mutation("dropNestedUnit", (state: any, payload: { path: string[] }) => {
        if (!state.memory.unit || payload.path.length === 0) {
            return;
        }

        setNestedValue(state.memory.unit, payload.path, null);
    });

    const patchStatus = store.mutation(
        "patchStatus",
        (state: any, payload: { action: string; status: EndpointStatus }) => {
            state.status[payload.action] = payload.status;
        },
    );

    function createActionStatus(actionName: string): ActionStatus {
        const current = store.getter(
            `${actionName}:current`,
            (state: any) => state.status[actionName] ?? EndpointStatus.IDLE,
        );

        const pending = store.getter(
            `${actionName}:pending`,
            (state: any) => state.status[actionName] === EndpointStatus.PENDING,
        );

        const success = store.getter(
            `${actionName}:success`,
            (state: any) => state.status[actionName] === EndpointStatus.SUCCESS,
        );

        const failed = store.getter(
            `${actionName}:failed`,
            (state: any) => state.status[actionName] === EndpointStatus.FAILED,
        );

        const idle = store.getter(
            `${actionName}:idle`,
            (state: any) => state.status[actionName] === EndpointStatus.IDLE,
        );

        return {
            current() {
                return current.value;
            },
            pending() {
                return pending.value;
            },
            success() {
                return success.value;
            },
            failed() {
                return failed.value;
            },
            idle() {
                return idle.value;
            },
        };
    }

    const monitor = {} as StoreMonitor<A>;

    for (const actionName in actions) {
        (monitor as any)[actionName] = createActionStatus(actionName);
    }

    async function withStatus<R>(actionName: string, operation: () => Promise<R>): Promise<R> {
        await options?.hooks?.before?.();

        if (store.state.status[actionName] === EndpointStatus.PENDING) {
            throw new Error(`Action "${actionName}" is already pending`);
        }

        patchStatus({
            action: actionName,
            status: EndpointStatus.PENDING,
        });

        try {
            const result = await operation();

            patchStatus({
                action: actionName,
                status: EndpointStatus.SUCCESS,
            });

            await options?.hooks?.after?.();

            return result;
        } catch (error: any) {
            patchStatus({
                action: actionName,
                status: EndpointStatus.FAILED,
            });

            await options?.hooks?.after?.(error);

            throw error;
        }
    }

    function applyMemoryOperation(
        memoryDefinition: MemoryDefinition | undefined,
        method: EndpointMethod,
        response: any,
        params?: Partial<S>,
    ): void {
        if (!memoryDefinition) {
            return;
        }

        const mutation = memoryDefinition.mutation ?? getDefaultMutation(method, memoryDefinition.on);

        if (memoryDefinition.on === "unit") {
            if (memoryDefinition.path.length > 0) {
                switch (mutation) {
                    case "set": {
                        setNestedUnit({
                            path: memoryDefinition.path,
                            value: response,
                        });

                        break;
                    }
                    case "edit": {
                        editNestedUnit({
                            path: memoryDefinition.path,
                            value: response,
                            deep: memoryDefinition.deep,
                        });

                        break;
                    }
                    case "drop": {
                        dropNestedUnit({
                            path: memoryDefinition.path,
                        });

                        break;
                    }
                }

                return;
            }

            switch (mutation) {
                case "set": {
                    setMemorizedUnit(response);

                    break;
                }
                case "edit": {
                    const editData = {
                        ...params,
                        ...response,
                    } as PartialWithIndicator<S, I>;

                    editMemorizedUnit({
                        unit: editData,
                        deep: memoryDefinition.deep,
                    });

                    // Also update in units if exists
                    editMemorizedUnits({
                        units: [editData],
                        deep: memoryDefinition.deep,
                    });

                    break;
                }
                case "drop": {
                    dropMemorizedUnit(params as PartialWithIndicator<S, I>);

                    break;
                }
            }

            return;
        }

        if (Array.isArray(response)) {
            switch (mutation) {
                case "set": {
                    setMemorizedUnits(response);

                    break;
                }
                case "edit": {
                    editMemorizedUnits({
                        units: response.map((item) => {
                            return {
                                ...params,
                                ...item,
                            };
                        }) as PartialWithIndicator<S, I>[],
                        deep: memoryDefinition.deep,
                    });

                    break;
                }
                case "drop": {
                    if (params) {
                        dropMemorizedUnits([params as PartialWithIndicator<S, I>]);

                        break;
                    }

                    dropMemorizedUnits(response as PartialWithIndicator<S, I>[]);

                    break;
                }
                case "add": {
                    addMemorizedUnits({
                        units: response,
                        prepend: memoryDefinition.prepend,
                    });

                    break;
                }
            }

            return;
        }

        switch (mutation) {
            case "set": {
                setMemorizedUnits([response]);

                break;
            }
            case "edit": {
                editMemorizedUnits({
                    units: [
                        {
                            ...params,
                            ...response,
                        },
                    ] as PartialWithIndicator<S, I>[],
                    deep: memoryDefinition.deep,
                });

                break;
            }
            case "drop": {
                if (params) {
                    dropMemorizedUnits([params as PartialWithIndicator<S, I>]);

                    break;
                }

                dropMemorizedUnits([response] as PartialWithIndicator<S, I>[]);

                break;
            }
            case "add": {
                addMemorizedUnits({
                    units: [response],
                    prepend: memoryDefinition.prepend,
                });

                break;
            }
        }
    }

    function resolveRequestBody(
        actionName: string,
        params?: Partial<S>,
        actionOptions?: ActionOptions,
    ): Partial<S> | undefined {
        if (actionOptions?.body) {
            return actionOptions.body as Partial<S>;
        }

        const cached = schemaCache.get(actionName);
        if (cached && cached.fields.length > 0 && params) {
            return cached.fields.reduce((accumulator, key) => {
                if (key in (params as any)) {
                    (accumulator as any)[key] = (params as any)[key];
                }

                return accumulator;
            }, {} as Partial<S>);
        }

        return params;
    }

    function validateRequestBody(actionName: string, params?: Partial<S>, partial?: boolean): void {
        const cached = schemaCache.get(actionName);
        if (!cached || cached.fields.length === 0) {
            return;
        }

        if (partial) {
            schema.pick<any>(cached.keys).partial().parse(params);

            return;
        }

        schema.pick<any>(cached.keys).parse(params);
    }

    function createActionFunction(actionName: string, actionDefinition: ActionDefinition<S>): ActionFunction<S> {
        return async (params?: Partial<S>, actionOptions?: ActionOptions): Promise<S | S[] | boolean> => {
            return withStatus(actionName, async () => {
                const url = resolveEndpointUrl(actionDefinition.endpoint, params);
                const body = resolveRequestBody(actionName, params, actionOptions);

                const adapter = actionOptions?.adapter ?? actionDefinition.endpoint.adapter;

                const baseOptions = {
                    query: actionOptions?.query,
                    headers: actionOptions?.headers,
                    signal: actionOptions?.signal,
                    ...(adapter && { adapter }),
                };

                let response: any;

                switch (actionDefinition.endpoint.method) {
                    case EndpointMethod.GET: {
                        response = await api().get<S>(url, baseOptions);

                        break;
                    }
                    case EndpointMethod.POST: {
                        if (actionOptions?.validate) {
                            validateRequestBody(actionName, params);
                        }

                        response = await api().post<S>(url, {
                            ...baseOptions,
                            body,
                        });

                        break;
                    }
                    case EndpointMethod.PUT: {
                        if (actionOptions?.validate) {
                            validateRequestBody(actionName, params);
                        }

                        response = await api().put<S>(url, {
                            ...baseOptions,
                            body,
                        });

                        break;
                    }
                    case EndpointMethod.PATCH: {
                        if (actionOptions?.validate) {
                            validateRequestBody(actionName, params, true);
                        }

                        response = await api().patch<S>(url, {
                            ...baseOptions,
                            body,
                        });

                        break;
                    }
                    case EndpointMethod.DELETE: {
                        await api().del<S>(url, baseOptions);

                        response = true;

                        break;
                    }
                }

                applyMemoryOperation(actionDefinition.memory, actionDefinition.endpoint.method, response, params);

                return response;
            });
        };
    }

    const storeActions = {} as StoreActions<A, S>;

    for (const actionName in actions) {
        (storeActions as any)[actionName] = createActionFunction(actionName, actions[actionName]);
    }

    const memory: StoreMemory<S, I> = {
        set(data: S | S[] | null) {
            if (Array.isArray(data)) {
                setMemorizedUnits(data);

                return;
            }

            setMemorizedUnit(data);
        },
        edit(data: PartialWithIndicator<S, I> | PartialWithIndicator<S, I>[], editOptions?: { deep?: boolean }) {
            if (Array.isArray(data)) {
                editMemorizedUnit({
                    unit: data[0],
                    deep: editOptions?.deep,
                });

                editMemorizedUnits({
                    units: data,
                    deep: editOptions?.deep,
                });

                return;
            }

            editMemorizedUnit({
                unit: data,
                deep: editOptions?.deep,
            });

            editMemorizedUnits({
                units: [data],
                deep: editOptions?.deep,
            });
        },
        drop(data: PartialWithIndicator<S, I> | PartialWithIndicator<S, I>[]) {
            if (Array.isArray(data)) {
                dropMemorizedUnit(data[0]);
                dropMemorizedUnits(data);

                return;
            }

            dropMemorizedUnit(data);
            dropMemorizedUnits([data]);
        },
    };

    return {
        store,
        alias,
        indicator: indicator as I,
        unit: memorizedUnit as unknown as ComputedRef<S | null>,
        units: memorizedUnits as unknown as ComputedRef<S[]>,
        action: storeActions,
        memory,
        monitor,
    };
}
