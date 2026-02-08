import type { ConsolaInstance } from "consola";

import type { ModelDefinitions, ModelDefinitionInfer } from "../types/model";
import type {
    RuntimeViewConfig,
    ViewFromDefinitionResolver,
    ViewMergeDefinitionResolver,
    ViewFromDefinition,
    ViewMergeDefinition,
    ViewFactory,
} from "../types/view";

export function createViewFactory<MD extends ModelDefinitions>(
    config?: RuntimeViewConfig,
    logger?: ConsolaInstance,
): ViewFactory<MD> {
    function from<K extends keyof MD, R = ModelDefinitionInfer<MD, K>>(
        model: K,
        resolver?: ViewFromDefinitionResolver<MD, K, R>,
    ): ViewFromDefinition<MD, K, R> {
        let key = "";
        const definition = {
            get key() {
                return key;
            },
            setKey(value: string) {
                key = value;
            },
            model: [model] as const,
            resolver,
            logger,
        };

        return definition as ViewFromDefinition<MD, K, R>;
    }

    function merge<K extends readonly (keyof MD)[], R>(
        models: K,
        resolver: ViewMergeDefinitionResolver<MD, K, R>,
    ): ViewMergeDefinition<MD, K, R> {
        let key = "";
        return {
            get key() {
                return key;
            },
            setKey(value: string) {
                key = value;
            },
            models,
            resolver,
            logger,
        } as ViewMergeDefinition<MD, K, R>;
    }

    return {
        from,
        merge,
    };
}
