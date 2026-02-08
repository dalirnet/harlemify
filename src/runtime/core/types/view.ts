import type { ComputedRef } from "vue";

import type { BaseDefinition } from "./base";
import type { ModelDefinitions, ModelDefinitionInfer, ModelDefinitionInferTuple } from "./model";

// Config

export interface RuntimeViewConfig {}

// Resolvers

export type ViewFromDefinitionResolver<MD extends ModelDefinitions, K extends keyof MD, R> = (
    model: ModelDefinitionInfer<MD, K>,
) => R;

export type ViewMergeDefinitionResolver<MD extends ModelDefinitions, K extends readonly (keyof MD)[], R> = (
    ...values: [...ModelDefinitionInferTuple<MD, K>]
) => R;

// Definitions

export interface ViewFromDefinition<
    MD extends ModelDefinitions,
    K extends keyof MD,
    R = ModelDefinitionInfer<MD, K>,
> extends BaseDefinition {
    model: readonly [K];
    resolver?: ViewFromDefinitionResolver<MD, K, R>;
}

export interface ViewMergeDefinition<
    MD extends ModelDefinitions,
    K extends readonly (keyof MD)[],
    R,
> extends BaseDefinition {
    models: K;
    resolver: ViewMergeDefinitionResolver<MD, K, R>;
}

export type ViewDefinition<MD extends ModelDefinitions> =
    | ViewFromDefinition<MD, keyof MD, unknown>
    | ViewMergeDefinition<MD, readonly (keyof MD)[], unknown>;

export type ViewDefinitions<MD extends ModelDefinitions> = Record<string, ViewDefinition<MD>>;

// Infer

export type ViewDefinitionInfer<MD extends ModelDefinitions, VD extends ViewDefinition<MD>> =
    VD extends ViewFromDefinition<MD, infer _K, infer R>
        ? R
        : VD extends ViewMergeDefinition<MD, infer _K, infer R>
          ? R
          : never;

// Factory

export interface ViewFactory<MD extends ModelDefinitions> {
    from<K extends keyof MD>(model: K): ViewFromDefinition<MD, K, ModelDefinitionInfer<MD, K>>;
    from<K extends keyof MD, R>(model: K, resolver: ViewFromDefinitionResolver<MD, K, R>): ViewFromDefinition<MD, K, R>;
    merge<MK1 extends keyof MD, MK2 extends keyof MD, R>(
        models: readonly [MK1, MK2],
        resolver: (mv1: ModelDefinitionInfer<MD, MK1>, mv2: ModelDefinitionInfer<MD, MK2>) => R,
    ): ViewMergeDefinition<MD, readonly [MK1, MK2], R>;
    merge<MK1 extends keyof MD, MK2 extends keyof MD, MK3 extends keyof MD, R>(
        models: readonly [MK1, MK2, MK3],
        resolver: (
            mv1: ModelDefinitionInfer<MD, MK1>,
            mv2: ModelDefinitionInfer<MD, MK2>,
            mv3: ModelDefinitionInfer<MD, MK3>,
        ) => R,
    ): ViewMergeDefinition<MD, readonly [MK1, MK2, MK3], R>;
    merge<K extends readonly (keyof MD)[], R>(
        models: K,
        resolver: ViewMergeDefinitionResolver<MD, K, R>,
    ): ViewMergeDefinition<MD, K, R>;
}

// Call

export type ViewCall<R = unknown> = ComputedRef<R>;

// Store View

export type StoreView<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>> = {
    readonly [K in keyof VD]: ViewCall<ViewDefinitionInfer<MD, VD[K]>>;
};
