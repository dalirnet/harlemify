import type { ConsolaInstance } from "consola";

import type { Shape, ShapeType } from "../types/shape";
import { wrapBaseDefinition } from "../utils/base";
import {
    type RuntimeModelConfig,
    type ModelDefaultIdentifier,
    type ModelOneDefinitionOptions,
    type ModelManyDefinitionOptions,
    type ModelOneDefinition,
    type ModelManyDefinition,
    type ModelFactory,
    ModelType,
    ModelManyKind,
} from "../types/model";

export function createModelFactory(config?: RuntimeModelConfig, logger?: ConsolaInstance): ModelFactory {
    function one<S extends Shape>(shape: ShapeType<S>, options?: ModelOneDefinitionOptions<S>): ModelOneDefinition<S> {
        return wrapBaseDefinition({
            shape,
            type: ModelType.ONE,
            options: {
                identifier: config?.identifier,
                ...options,
            },
            logger,
        });
    }

    function many<
        S extends Shape,
        I extends keyof S = ModelDefaultIdentifier<S>,
        T extends ModelManyKind = ModelManyKind.LIST,
    >(shape: ShapeType<S>, options?: ModelManyDefinitionOptions<S, I, T>): ModelManyDefinition<S, I, T> {
        return wrapBaseDefinition({
            shape,
            type: ModelType.MANY,
            options: {
                identifier: config?.identifier as I | undefined,
                ...options,
            },
            logger,
        }) as ModelManyDefinition<S, I, T>;
    }

    return {
        one,
        many,
    };
}
