import type { ConsolaInstance } from "consola";

// Base Definition

export interface BaseDefinition {
    readonly key: string;
    logger?: ConsolaInstance;
    setKey(key: string): void;
}
