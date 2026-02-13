import type { createStore as createSourceStore } from "@harlem/core";

import { createModel, resolveDefault } from "./model";
import { createView } from "./view";
import { createAction } from "./action";

import {
    type ModelDefinitions,
    type ModelDefinitionsInfer,
    type StoreModel,
    ModelType,
    ModelManyKind,
} from "../types/model";
import type { ViewDefinition, ViewDefinitions, StoreView } from "../types/view";
import type { ActionDefinition, ActionDefinitions, StoreAction } from "../types/action";

// Store State

function createState(definition: ModelDefinitions[string]): unknown {
    let fallback: unknown = null;
    if (definition.type !== ModelType.ONE) {
        fallback = definition.options?.kind === ModelManyKind.RECORD ? {} : [];
    }

    return resolveDefault(definition.options, fallback);
}

export function createStoreState<MD extends ModelDefinitions>(modelDefinitions: MD): ModelDefinitionsInfer<MD> {
    const output = {} as ModelDefinitionsInfer<MD>;
    for (const [key, definition] of Object.entries(modelDefinitions)) {
        (output as Record<string, unknown>)[key] = createState(definition);
    }

    return output;
}

// Store Model

export function createStoreModel<MD extends ModelDefinitions>(
    modelDefinitions: MD,
    source: ReturnType<typeof createSourceStore>,
): StoreModel<MD> {
    const output = {} as StoreModel<MD>;
    for (const [key, definition] of Object.entries(modelDefinitions)) {
        definition.key = key;

        (output as Record<string, unknown>)[key] = createModel(definition, source);
    }

    return output;
}

// Store View

export function createStoreView<MD extends ModelDefinitions, VD extends ViewDefinitions<MD>>(
    viewDefinitions: VD,
    source: ReturnType<typeof createSourceStore>,
): StoreView<MD, VD> {
    const output = {} as StoreView<MD, VD>;
    for (const [key, definition] of Object.entries(viewDefinitions)) {
        definition.key = key;

        (output as Record<string, unknown>)[key] = createView(definition as ViewDefinition<MD>, source);
    }

    return output;
}

// Store Action

export function createStoreAction<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    AD extends ActionDefinitions<MD, VD>,
>(
    actionDefinitions: Record<string, ActionDefinition<MD, VD>>,
    model: StoreModel<MD>,
    view: StoreView<MD, VD>,
): StoreAction<MD, VD, AD> {
    const output = {} as StoreAction<MD, VD, AD>;
    for (const [key, definition] of Object.entries(actionDefinitions)) {
        definition.key = key;

        (output as Record<string, unknown>)[key] = createAction<MD, VD, unknown>(definition, model, view);
    }

    return output;
}
