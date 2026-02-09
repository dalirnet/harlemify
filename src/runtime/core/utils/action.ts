import { defu } from "defu";
import { type DeepReadonly, type Ref, ref, computed, readonly, toValue, nextTick } from "vue";

import { type StoreModel, type ModelDefinitions, type ModelCall, ModelOneMode, ModelManyMode } from "../types/model";
import type { Shape } from "../types/shape";
import type { StoreView, ViewDefinitions } from "../types/view";
import {
    type ActionApiCommit,
    type ActionApiDefinition,
    type ActionCall,
    type ActionCallOptions,
    type ActionDefinition,
    type ActionHandlerDefinition,
    type ActionResolvedApi,
    ActionApiMethod,
    ActionStatus,
    ActionConcurrent,
} from "../types/action";
import { trimStart, trimEnd, isEmptyRecord, isPlainObject } from "./base";
import {
    ActionApiError,
    ActionHandlerError,
    ActionCommitError,
    ActionConcurrentError,
    isError,
    toError,
} from "./error";
import { resolveAliasInbound, resolveAliasOutbound } from "./shape";

// Resolve Value

function resolveValue<V, T>(value: unknown, view: V, fallback?: T): T {
    if (typeof value === "function") {
        return (value as (view: V) => T)(view) || (fallback as T);
    }

    return toValue(value as T) || (fallback as T);
}

// Resolve Api

function resolveApiUrl<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    definition: ActionApiDefinition<MD, VD>,
    view: StoreView<MD, VD>,
    options?: ActionCallOptions,
): string {
    const endpoint = trimEnd(definition.request.endpoint ?? "", "/");
    let path = resolveValue<StoreView<MD, VD>, string>(definition.request.url, view);

    if (options?.params) {
        for (const [key, value] of Object.entries(options.params)) {
            path = path.replace(`:${key}`, encodeURIComponent(value));
        }
    }

    if (endpoint) {
        return `${endpoint}/${trimStart(path, "/")}`;
    }

    return path;
}

function resolveApiHeaders<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    definition: ActionApiDefinition<MD, VD>,
    view: StoreView<MD, VD>,
    options?: ActionCallOptions,
): Record<string, string> {
    const initial = resolveValue(definition.request.headers, view, {});
    const custom = options?.headers ?? {};

    return defu(custom, initial);
}

function resolveApiQuery<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    definition: ActionApiDefinition<MD, VD>,
    view: StoreView<MD, VD>,
    options?: ActionCallOptions,
): Record<string, unknown> {
    const initial = resolveValue(definition.request.query, view, {});
    const custom = options?.query ?? {};

    return defu(custom, initial);
}

function resolveApiBody<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    definition: ActionApiDefinition<MD, VD>,
    view: StoreView<MD, VD>,
    target: ModelCall<Shape> | undefined,
    options?: ActionCallOptions,
): Record<string, unknown> | BodyInit | null | undefined {
    if (definition.request.method === ActionApiMethod.GET || definition.request.method === ActionApiMethod.HEAD) {
        return undefined;
    }

    const initial = resolveValue(definition.request.body, view, {});
    const custom = options?.body ?? {};

    const body = defu(custom as Record<string, unknown>, initial);
    if (!isPlainObject(body)) {
        return body;
    }

    if (!isEmptyRecord(target?.aliases())) {
        return resolveAliasOutbound(body, target.aliases());
    }

    return body;
}

function resolveApiMethod<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    definition: ActionApiDefinition<MD, VD>,
    view: StoreView<MD, VD>,
): ActionApiMethod {
    return resolveValue<StoreView<MD, VD>, ActionApiMethod>(definition.request.method, view, ActionApiMethod.GET);
}

function resolveApiTimeout<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    definition: ActionApiDefinition<MD, VD>,
    view: StoreView<MD, VD>,
    options?: ActionCallOptions,
): number | undefined {
    if (options?.timeout) {
        return options.timeout;
    }

    if (definition.request.timeout) {
        return resolveValue<StoreView<MD, VD>, number>(definition.request.timeout, view);
    }

    return undefined;
}

function resolveApiSignal(options?: ActionCallOptions, abortController?: AbortController): AbortSignal {
    if (options?.signal) {
        return options.signal;
    }

    return abortController!.signal;
}

// Resolve Commit

function resolveCommitTarget<MD extends ModelDefinitions>(
    commit: ActionApiCommit<MD> | undefined,
    model: StoreModel<MD>,
): ModelCall<Shape> | undefined {
    if (commit) {
        return model[commit.model] as ModelCall<Shape>;
    }

    return undefined;
}

function resolveCommitMode<MD extends ModelDefinitions>(
    commit: ActionApiCommit<MD> | undefined,
    options?: ActionCallOptions,
): (ModelOneMode | ModelManyMode) | undefined {
    if (commit) {
        if (options?.commit?.mode) {
            return options.commit.mode;
        }

        return commit.mode;
    }

    return undefined;
}

function resolveCommitValue<MD extends ModelDefinitions>(commit: ActionApiCommit<MD>, data: unknown): unknown {
    if (typeof commit.value === "function") {
        return commit.value(data);
    }

    return data;
}

// Type Guards

function isApiDefinition<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    definition: ActionDefinition<MD, VD>,
): definition is ActionApiDefinition<MD, VD> {
    return "request" in definition;
}

// Resolve Concurrent

function resolveConcurrent<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    definition: ActionDefinition<MD, VD>,
    options?: ActionCallOptions,
): ActionConcurrent {
    if (options?.concurrent) {
        return options.concurrent;
    }

    if (isApiDefinition(definition) && definition.request.concurrent) {
        return definition.request.concurrent;
    }

    return ActionConcurrent.BLOCK;
}

// Execute Api

async function executeApi<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>, R>(
    definition: ActionApiDefinition<MD, VD>,
    api: ActionResolvedApi,
    options?: ActionCallOptions,
): Promise<R> {
    try {
        definition.logger?.debug("Action API request", {
            action: definition.key,
            method: api.method,
            url: api.url,
        });

        if (options?.transformer?.request) {
            api = options.transformer.request(api);
        }

        const response = await $fetch<R>(api.url, {
            method: api.method,
            headers: api.headers,
            query: api.query,
            body: api.body,
            timeout: api.timeout,
            signal: api.signal,
            responseType: "json" as const,
        });

        definition.logger?.debug("Action API response received", {
            action: definition.key,
            method: api.method,
            url: api.url,
        });

        if (options?.transformer?.response) {
            return options.transformer.response(response) as R;
        }

        return response as R;
    } catch (error: unknown) {
        const fetchError = toError(error, ActionApiError);

        definition.logger?.error("Action API error", {
            action: definition.key,
            error: fetchError.message,
        });

        throw fetchError;
    }
}

// Execute Handler

async function executeHandler<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>, R>(
    definition: ActionHandlerDefinition<MD, VD, R>,
    model: StoreModel<MD>,
    view: StoreView<MD, VD>,
): Promise<R> {
    try {
        definition.logger?.debug("Action handler phase", {
            action: definition.key,
        });

        return await definition.callback({
            model,
            view,
        });
    } catch (error: unknown) {
        if (isError(error, ActionApiError, ActionHandlerError)) {
            throw error;
        }

        const handlerError = toError(error, ActionHandlerError);

        definition.logger?.error("Action handler error", {
            action: definition.key,
            error: handlerError.message,
        });

        throw handlerError;
    }
}

// Execute Commit

function executeCommit<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    definition: ActionApiDefinition<MD, VD>,
    target: ModelCall<Shape> | undefined,
    mode: (ModelOneMode | ModelManyMode) | undefined,
    data: unknown,
): void {
    if (!definition.commit) {
        return;
    }

    if (!target || !mode) {
        throw new ActionCommitError({
            message: `Model "${definition.commit.model as string}" is not defined`,
        });
    }

    try {
        definition.logger?.debug("Action commit phase", {
            action: definition.key,
            target,
            mode,
        });

        if (!isEmptyRecord(target.aliases())) {
            data = resolveAliasInbound(data, target.aliases());
        }

        const value = resolveCommitValue(definition.commit, data);

        target.commit(mode, value, definition.commit.options);
    } catch (error: unknown) {
        const commitError = toError(error, ActionCommitError);

        definition.logger?.error("Action commit error", {
            action: definition.key,
            error: commitError.message,
        });

        throw commitError;
    }
}

// Create Action

export function createAction<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>, R>(
    definition: ActionDefinition<MD, VD>,
    model: StoreModel<MD>,
    view: StoreView<MD, VD>,
): ActionCall<R> {
    definition.logger?.debug("Registering action", {
        action: definition.key,
        type: isApiDefinition(definition) ? "api" : "handler",
    });

    let currentController: Promise<R> | null = null;
    let abortController: AbortController | null = null;

    let globalData: R | null = null;

    const globalError = ref<Error | null>(null);
    const globalStatus = ref<ActionStatus>(ActionStatus.IDLE);

    const loading = computed(() => {
        return globalStatus.value === ActionStatus.PENDING;
    });

    async function execute(options?: ActionCallOptions): Promise<R> {
        await nextTick();

        const concurrent = resolveConcurrent(definition, options);

        if (loading.value) {
            switch (concurrent) {
                case ActionConcurrent.BLOCK: {
                    definition.logger?.error("Action blocked by concurrent guard", {
                        action: definition.key,
                    });

                    throw new ActionConcurrentError();
                }
                case ActionConcurrent.SKIP: {
                    definition.logger?.warn("Action skipped by concurrent guard", {
                        action: definition.key,
                    });

                    return currentController!;
                }
                case ActionConcurrent.CANCEL: {
                    definition.logger?.warn("Action cancelling previous execution", {
                        action: definition.key,
                    });

                    abortController?.abort();
                }
            }
        }

        abortController = new AbortController();

        const activeStatus = options?.bind?.status ?? globalStatus;
        const activeError = options?.bind?.error ?? globalError;

        activeStatus.value = ActionStatus.PENDING;
        activeError.value = null;

        currentController = (async () => {
            try {
                let data: R;

                if (isApiDefinition(definition)) {
                    const target = resolveCommitTarget(definition.commit, model);
                    const mode = resolveCommitMode(definition.commit, options);

                    const url = resolveApiUrl(definition, view, options);
                    const method = resolveApiMethod(definition, view);
                    const headers = resolveApiHeaders(definition, view, options);
                    const query = resolveApiQuery(definition, view, options);
                    const body = resolveApiBody(definition, view, target, options);
                    const timeout = resolveApiTimeout(definition, view, options);
                    const signal = resolveApiSignal(options, abortController!);

                    data = await executeApi<MD, VD, R>(
                        definition,
                        {
                            url,
                            method,
                            headers,
                            query,
                            body,
                            timeout,
                            signal,
                        },
                        options,
                    );

                    executeCommit(definition, target, mode, data);
                } else {
                    data = await executeHandler(definition as ActionHandlerDefinition<MD, VD, R>, model, view);
                }

                globalData = data;
                activeStatus.value = ActionStatus.SUCCESS;

                definition.logger?.debug("Action success", {
                    action: definition.key,
                });

                return data;
            } catch (actionError) {
                activeError.value = actionError as Error;
                activeStatus.value = ActionStatus.ERROR;

                throw actionError;
            } finally {
                currentController = null;
                abortController = null;
            }
        })();

        return currentController;
    }

    const action = Object.assign(execute, {
        get loading() {
            return loading;
        },
        get error() {
            return readonly(globalError) as Readonly<Ref<Error | null>>;
        },
        get status() {
            return readonly(globalStatus) as Readonly<Ref<ActionStatus>>;
        },
        get data() {
            return globalData as DeepReadonly<R> | null;
        },
        reset() {
            globalError.value = null;
            globalStatus.value = ActionStatus.IDLE;
            globalData = null;
        },
    });

    return action;
}
