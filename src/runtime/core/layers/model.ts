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
    ModelKind,
} from "../types/model";

export function createModelFactory(config?: RuntimeModelConfig, logger?: ConsolaInstance): ModelFactory {
    function one<S extends Shape>(shape: ShapeType<S>, options?: ModelOneDefinitionOptions<S>): ModelOneDefinition<S> {
        return wrapBaseDefinition({
            shape,
            kind: ModelKind.OBJECT,
            options: {
                identifier: config?.identifier,
                ...options,
            },
            logger,
        });
    }

    function many<S extends Shape, I extends keyof S = ModelDefaultIdentifier<S>>(
        shape: ShapeType<S>,
        options?: ModelManyDefinitionOptions<S, I>,
    ): ModelManyDefinition<S, I> {
        return wrapBaseDefinition({
            shape,
            kind: ModelKind.ARRAY,
            options: {
                identifier: config?.identifier as I | undefined,
                ...options,
            },
            logger,
        });
    }

    return {
        one,
        many,
    };
}
