import type { ConsolaInstance } from "consola";

import type { Shape, ShapeType } from "../types/shape";
import {
    type RuntimeModelConfig,
    type ModelOneDefinitionOptions,
    type ModelManyDefinitionOptions,
    type ModelOneDefinition,
    type ModelManyDefinition,
    type ModelFactory,
    ModelKind,
} from "../types/model";

export function createModelFactory(config?: RuntimeModelConfig, logger?: ConsolaInstance): ModelFactory {
    function one<S extends Shape>(shape: ShapeType<S>, options?: ModelOneDefinitionOptions<S>): ModelOneDefinition<S> {
        let key = "";
        return {
            get key() {
                return key;
            },
            setKey(value: string) {
                key = value;
            },
            shape,
            kind: ModelKind.OBJECT,
            options: {
                identifier: config?.identifier,
                ...options,
            },
            logger,
        } as ModelOneDefinition<S>;
    }

    function many<S extends Shape>(
        shape: ShapeType<S>,
        options?: ModelManyDefinitionOptions<S>,
    ): ModelManyDefinition<S> {
        let key = "";
        return {
            get key() {
                return key;
            },
            setKey(value: string) {
                key = value;
            },
            shape,
            kind: ModelKind.ARRAY,
            options: {
                identifier: config?.identifier,
                ...options,
            },
            logger,
        } as ModelManyDefinition<S>;
    }

    return {
        one,
        many,
    };
}
