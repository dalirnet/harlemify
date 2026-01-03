import { createConfigForNuxt } from "@nuxt/eslint-config/flat";

export default createConfigForNuxt({}).override("nuxt/typescript", {
    rules: {
        "@typescript-eslint/no-explicit-any": "off",
    },
});
