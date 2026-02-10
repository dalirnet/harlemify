import { defu } from "defu";
import type { Store as SourceStore, BaseState, Mutation } from "@harlem/core";

import { ensureArray } from "./base";
import { resolveShape } from "./shape";

import type { ShapeDefinition, Shape, ShapeResolved } from "../types/shape";
import {
    type ModelDefinition,
    type ModelOneDefinition,
    type ModelManyDefinition,
    type ModelOneCommitOptions,
    type ModelManyCommitOptions,
    type ModelOneCommit,
    type ModelManyListCommit,
    type ModelManyRecordCommit,
    type ModelCall,
    ModelType,
    ModelManyKind,
    ModelOneMode,
    ModelManyMode,
} from "../types/model";

// Resolve Identifier

function resolveIdentifier<S extends Shape>(
    definition: ModelOneDefinition<S> | ModelManyDefinition<S, any>,
    shape: ShapeResolved,
): string {
    if (definition.options?.identifier) {
        return definition.options.identifier as string;
    }

    return shape.identifier ?? "id";
}

// Create One Commit

function createOneCommit<S extends Shape>(
    definition: ModelOneDefinition<S>,
    source: SourceStore<BaseState>,
): ModelOneCommit<S> {
    const setOperation: Mutation<S> = source.mutation(`${definition.key}:set`, (state, value: S) => {
        state[definition.key] = value;
    });

    const resetOperation: Mutation<undefined> = source.mutation(`${definition.key}:reset`, (state) => {
        state[definition.key] = definition.options?.default ?? null;
    });

    const patchOperation: Mutation<{
        value: Partial<S>;
        options?: ModelOneCommitOptions;
    }> = source.mutation(
        `${definition.key}:patch`,
        (state, payload: { value: Partial<S>; options?: ModelOneCommitOptions }) => {
            if (state[definition.key] === null) {
                return;
            }

            if (payload.options?.deep) {
                state[definition.key] = defu(payload.value, state[definition.key]) as S;

                return;
            }

            state[definition.key] = {
                ...state[definition.key],
                ...payload.value,
            };
        },
    );

    function set(value: S) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "set",
        });

        setOperation(value);
    }

    function reset() {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "reset",
        });

        resetOperation();
    }

    function patch(value: Partial<S>, options?: ModelOneCommitOptions) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "patch",
        });

        patchOperation({
            value,
            options,
        });
    }

    return {
        set,
        reset,
        patch,
    };
}

// Create Many List Commit

function createManyListCommit<S extends Shape>(
    definition: ModelManyDefinition<S, any>,
    shape: ShapeResolved,
    source: SourceStore<BaseState>,
): ModelManyListCommit<S, any> {
    const identifier = resolveIdentifier(definition, shape);

    const setOperation: Mutation<S[]> = source.mutation(`${definition.key}:set`, (state, value: S[]) => {
        state[definition.key] = value;
    });

    const resetOperation: Mutation<undefined> = source.mutation(`${definition.key}:reset`, (state) => {
        state[definition.key] = definition.options?.default ?? [];
    });

    const patchOperation: Mutation<{
        value: Partial<S> | Partial<S>[];
        options?: ModelManyCommitOptions;
    }> = source.mutation(
        `${definition.key}:patch`,
        (state, payload: { value: Partial<S> | Partial<S>[]; options?: ModelManyCommitOptions }) => {
            const items = ensureArray(payload.value);
            const by = payload.options?.by ?? identifier;

            state[definition.key] = state[definition.key].map((item: S) => {
                const found = items.find((partial) => {
                    return partial[by] === item[by];
                });

                if (!found) {
                    return item;
                }

                if (payload.options?.deep) {
                    return defu(found, item) as S;
                }

                return {
                    ...item,
                    ...found,
                };
            });
        },
    );

    const removeOperation: Mutation<Partial<S> | Partial<S>[]> = source.mutation(
        `${definition.key}:remove`,
        (state, value: Partial<S> | Partial<S>[]) => {
            const items = ensureArray(value);

            state[definition.key] = state[definition.key].filter((item: S) => {
                return !items.some((match) => {
                    let keys = Object.keys(match);
                    if (identifier in match) {
                        keys = [identifier];
                    }

                    return keys.every((key) => {
                        return item[key] === match[key];
                    });
                });
            });
        },
    );

    const addOperation: Mutation<{
        value: S | S[];
        options?: ModelManyCommitOptions;
    }> = source.mutation(
        `${definition.key}:add`,
        (state, payload: { value: S | S[]; options?: ModelManyCommitOptions }) => {
            let items = ensureArray(payload.value);

            if (payload.options?.unique) {
                const by = payload.options.by ?? identifier;

                const existingIds = new Set(
                    state[definition.key].map((item: S) => {
                        return item[by];
                    }),
                );

                items = items.filter((item) => {
                    return !existingIds.has(item[by]);
                });
            }

            if (payload.options?.prepend) {
                state[definition.key] = [...items, ...state[definition.key]];

                return;
            }

            state[definition.key] = [...state[definition.key], ...items];
        },
    );

    function set(value: S[]) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "set",
        });

        setOperation(value);
    }

    function reset() {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "reset",
        });

        resetOperation();
    }

    function patch(value: Partial<S> | Partial<S>[], options?: ModelManyCommitOptions) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "patch",
        });

        patchOperation({
            value,
            options,
        });
    }

    function remove(value: Partial<S> | Partial<S>[]) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "remove",
        });

        removeOperation(value);
    }

    function add(value: S | S[], options?: ModelManyCommitOptions) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "add",
        });

        addOperation({
            value,
            options,
        });
    }

    return {
        set,
        reset,
        patch,
        remove,
        add,
    } as ModelManyListCommit<S, any>;
}

// Create Many Record Commit

function createManyRecordCommit<S extends Shape>(
    definition: ModelManyDefinition<S, any>,
    source: SourceStore<BaseState>,
): ModelManyRecordCommit<S> {
    const setOperation: Mutation<Record<string, S[]>> = source.mutation(
        `${definition.key}:set`,
        (state, value: Record<string, S[]>) => {
            state[definition.key] = value;
        },
    );

    const resetOperation: Mutation<undefined> = source.mutation(`${definition.key}:reset`, (state) => {
        state[definition.key] = definition.options?.default ?? {};
    });

    const patchOperation: Mutation<{
        value: Record<string, S[]>;
        options?: ModelOneCommitOptions;
    }> = source.mutation(
        `${definition.key}:patch`,
        (state, payload: { value: Record<string, S[]>; options?: ModelOneCommitOptions }) => {
            if (payload.options?.deep) {
                state[definition.key] = defu(payload.value, state[definition.key]) as Record<string, S[]>;

                return;
            }

            state[definition.key] = {
                ...state[definition.key],
                ...payload.value,
            };
        },
    );

    const removeOperation: Mutation<string> = source.mutation(`${definition.key}:remove`, (state, key: string) => {
        const record: Record<string, S[]> = {};
        for (const entry of Object.keys(state[definition.key])) {
            if (entry !== key) {
                record[entry] = state[definition.key][entry];
            }
        }

        state[definition.key] = record;
    });

    const addOperation: Mutation<{ key: string; value: S[] }> = source.mutation(
        `${definition.key}:add`,
        (state, payload: { key: string; value: S[] }) => {
            state[definition.key] = {
                ...state[definition.key],
                [payload.key]: payload.value,
            };
        },
    );

    function set(value: Record<string, S[]>) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "set",
        });

        setOperation(value);
    }

    function reset() {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "reset",
        });

        resetOperation();
    }

    function patch(value: Record<string, S[]>, options?: ModelOneCommitOptions) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "patch",
        });

        patchOperation({ value, options });
    }

    function remove(key: string) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "remove",
        });

        removeOperation(key);
    }

    function add(key: string, value: S[]) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "add",
        });

        addOperation({ key, value });
    }

    return {
        set,
        reset,
        patch,
        remove,
        add,
    } as ModelManyRecordCommit<S>;
}

// Type Guards

function isOneDefinition<S extends Shape>(definition: ModelDefinition<S>): definition is ModelOneDefinition<S> {
    return definition.type === ModelType.ONE;
}

function isManyRecordDefinition<S extends Shape>(definition: ModelManyDefinition<S, any, any>): boolean {
    return definition.options?.kind === ModelManyKind.RECORD;
}

// Resolve Commit

function resolveManyCommit<S extends Shape>(
    definition: ModelManyDefinition<S, any, any>,
    shape: ShapeResolved,
    source: SourceStore<BaseState>,
): ModelManyListCommit<S, any> | ModelManyRecordCommit<S> {
    if (isManyRecordDefinition(definition)) {
        return createManyRecordCommit(definition, source);
    }

    return createManyListCommit(definition, shape, source);
}

function resolveCommit<S extends Shape>(
    definition: ModelDefinition<S>,
    shape: ShapeResolved,
    source: SourceStore<BaseState>,
): ModelOneCommit<S> | ModelManyListCommit<S, any> | ModelManyRecordCommit<S> {
    if (isOneDefinition(definition)) {
        return createOneCommit(definition, source);
    }

    return resolveManyCommit(definition, shape, source);
}

// Create Model

export function createModel<S extends Shape>(
    definition: ModelDefinition<S>,
    source: SourceStore<BaseState>,
): ModelCall<S> {
    definition.logger?.debug("Registering model", {
        model: definition.key,
        type: definition.type,
    });

    const shape = resolveShape(definition.shape as ShapeDefinition);
    const commit = resolveCommit(definition, shape, source);

    const model = Object.assign(commit, {
        commit(mode: ModelOneMode | ModelManyMode, value?: unknown, options?: unknown) {
            const handler = commit[mode as keyof typeof commit] as (...args: unknown[]) => void;
            switch (mode) {
                case ModelOneMode.RESET:
                case ModelManyMode.RESET: {
                    handler();

                    break;
                }
                default: {
                    handler(value, options);
                }
            }
        },
        aliases() {
            return shape.aliases;
        },
    }) as ModelCall<S>;

    return model;
}
