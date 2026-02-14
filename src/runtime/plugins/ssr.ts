import { EVENTS, type HarlemPlugin, type InternalStores, type EventBus } from "@harlem/core";

// Types

interface ServerSideRenderingContext {
    hooks: { hook: (name: "app:rendered", fn: () => void) => void };
    payload: Record<string, unknown>;
}

type HarlemState = Record<string, Record<string, unknown>>;

// Server

function handleServer(nuxtApp: ServerSideRenderingContext, stores: InternalStores): void {
    stores.forEach((store) => {
        store.reset();
    });

    nuxtApp.hooks.hook("app:rendered", () => {
        const snapshot: HarlemState = {};
        stores.forEach((store) => {
            snapshot[store.name] = store.state;
        });

        nuxtApp.payload.harlemifyState = snapshot;
    });
}

// Client

function handleClient(nuxtApp: ServerSideRenderingContext, eventEmitter: EventBus, stores: InternalStores): void {
    const harlemifyState = nuxtApp.payload.harlemifyState as HarlemState | undefined;
    if (!harlemifyState) {
        return;
    }

    eventEmitter.on(EVENTS.ssr.initClient, (payload) => {
        if (!payload) {
            return;
        }

        const store = stores.get(payload.store);
        if (!store) {
            return;
        }

        if (store.name in harlemifyState) {
            store.write("harlemify:ssr:init", "harlemify", (state) => {
                Object.assign(state, harlemifyState[store.name]);
            });
        }
    });
}

// Server Side Rendering Plugin

export function createServerSideRenderingPlugin(nuxtApp: ServerSideRenderingContext): HarlemPlugin {
    return (app, eventEmitter, stores) => {
        if (import.meta.server) {
            handleServer(nuxtApp, stores);
        }

        if (import.meta.client) {
            handleClient(nuxtApp, eventEmitter, stores);
        }
    };
}
