import type { ModelDefinitions, ModelFactory, StoreModel } from "./model";
import type { ViewDefinitions, ViewFactory, StoreView } from "./view";
import type { ActionDefinition, ActionDefinitions, ActionFactory, StoreAction } from "./action";

// Store Config

export interface StoreConfig<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    _AD extends ActionDefinitions<MD, VD>,
> {
    name: string;
    model: (factory: ModelFactory) => MD;
    view: (factory: ViewFactory<MD>) => VD;
    action: (factory: ActionFactory<MD, VD>) => Record<string, ActionDefinition<MD, VD>>;
}

// Store

export interface Store<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    AD extends ActionDefinitions<MD, VD>,
> {
    model: StoreModel<MD>;
    view: StoreView<MD, VD>;
    action: StoreAction<MD, VD, AD>;
}
