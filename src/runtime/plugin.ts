import { createVuePlugin } from "@harlem/core";
import {
    createClientSSRPlugin,
    createServerSSRPlugin,
} from "@harlem/plugin-ssr";

export default defineNuxtPlugin((nuxtApp) => {
    const plugins = [];

    if (nuxtApp.payload.serverRendered) {
        if (import.meta.server) {
            plugins.push(createServerSSRPlugin());
        }

        if (import.meta.client) {
            plugins.push(createClientSSRPlugin());
        }
    }

    const harlem = createVuePlugin({
        plugins,
    });

    nuxtApp.vueApp.use(harlem);
});
