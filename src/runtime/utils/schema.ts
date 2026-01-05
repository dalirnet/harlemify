import { z } from "zod";

import type { ApiAction } from "../core/api";
import type { EndpointDefinition } from "./endpoint";

export interface SchemaMeta {
    indicator?: boolean;
    actions?: ApiAction[];
}

export function getMeta(field: any): SchemaMeta | undefined {
    return (field as z.ZodType).meta() as any;
}

export interface ResolveSchemaOptions<S> {
    indicator?: keyof S;
    endpoint?: EndpointDefinition<Partial<S>>;
    unit?: Partial<S>;
}

export function resolveSchema<
    T extends z.ZodRawShape,
    S extends z.infer<z.ZodObject<T>>,
>(schema: z.ZodObject<T>, options?: ResolveSchemaOptions<S>) {
    const output = {
        indicator: (options?.indicator ?? "id") as keyof S,
        keys: {} as Record<keyof S, true>,
        values: {} as Partial<S>,
    };

    for (const key of Object.keys(schema.shape)) {
        const meta = getMeta(schema.shape[key]);

        if (meta?.indicator) {
            output.indicator = key as keyof S;
        }

        if (!options?.endpoint?.action || !meta?.actions) {
            continue;
        }

        if (meta?.actions.includes(options.endpoint.action)) {
            output.keys[key as keyof S] = true;

            if (options?.unit && key in options.unit) {
                (output.values as any)[key] = (options.unit as any)[key];
            }
        }
    }

    return output;
}
