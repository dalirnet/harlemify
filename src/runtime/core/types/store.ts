import type { ModelDefinitions, ModelFactory, StoreModel } from "./model";
import type { ViewDefinitions, ViewFactory, StoreView } from "./view";
import type { ActionDefinitions, ActionFactory, StoreAction } from "./action";

// Store Config

export interface StoreConfig<
    MD extends ModelDefinitions,
    VD extends ViewDefinitions<MD>,
    AD extends ActionDefinitions<MD, VD>,
> {
    name: string;
    model: (factory: ModelFactory) => MD;
    view: (factory: ViewFactory<MD>) => VD;
    action: (factory: ActionFactory<MD, VD>) => AD;
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
