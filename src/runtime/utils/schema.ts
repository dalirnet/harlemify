import { z } from "zod";

import type { ApiAction } from "../core/api";

export interface SchemaMeta {
    indicator?: boolean;
    actions?: ApiAction[];
}

export function getMeta(field: any): SchemaMeta | undefined {
    return (field as z.ZodType).meta() as any;
}

export function resolveSchema<
    T extends z.ZodRawShape,
    S extends z.infer<z.ZodObject<T>>,
>(schema: z.ZodObject<T>, action?: ApiAction, input?: Partial<S>) {
    const output = {
        indicator: "id" as keyof S,
        keys: {} as Record<keyof S, true>,
        values: {} as Partial<S>,
    };

    for (const key of Object.keys(schema.shape)) {
        const meta = getMeta(schema.shape[key]);

        if (meta?.indicator) {
            output.indicator = key as keyof S;
        }

        if (!action || !meta?.actions) {
            continue;
        }

        if (meta?.actions.includes(action)) {
            output.keys[key as keyof S] = true;

            if (input && key in input) {
                (output.values as any)[key] = (input as any)[key];
            }
        }
    }

    return output;
}
