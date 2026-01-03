import "zod";
import type { StoreSchemaMeta } from "./runtime";
import type { ModuleOptions } from "./module";

declare module "zod" {
    interface GlobalMeta extends StoreSchemaMeta {}
}

declare module "@nuxt/schema" {
    interface PublicRuntimeConfig {
        harlemify: ModuleOptions;
    }
}
