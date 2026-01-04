import "zod";
import type { SchemaMeta } from "./runtime";
import type { ModuleOptions } from "./module";

declare module "zod" {
    interface GlobalMeta extends SchemaMeta {}
}

declare module "@nuxt/schema" {
    interface PublicRuntimeConfig {
        harlemify: ModuleOptions;
    }
}
