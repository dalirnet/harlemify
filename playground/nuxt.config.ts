export default defineNuxtConfig({
    modules: ["../src/module"],
    harlemify: {
        api: {
            url: "https://api.example.com",
            timeout: 7500,
        },
    },
    devtools: {
        enabled: true,
    },
});
