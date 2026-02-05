import { createSchema } from "../utils/schema";

import type { SchemaShape, SchemaObject, SchemaInfer } from "../utils/schema";

export type SchemaDefinition<T extends SchemaShape, M extends "infer" | never = never> = M extends "infer"
    ? SchemaInfer<T>
    : SchemaObject<T>;

export interface StoreSchema<S> {
    indicator: keyof S;
    keys: Record<keyof S, true>;
    values: Partial<S>;
}

export interface StoreSchemaOptions<S> {
    indicator?: keyof S;
    action?: string;
    unit?: Partial<S>;
}

export function createStoreSchema<T extends SchemaShape, S extends SchemaInfer<T>>(
    schemaDefinition: SchemaObject<T>,
    options?: StoreSchemaOptions<S>,
): StoreSchema<S> {
    const schema = createSchema(schemaDefinition);

    const output: StoreSchema<S> = {
        indicator: (options?.indicator ?? "id") as any,
        keys: {} as any,
        values: {} as any,
    };

    const fields = schema.getFields();
    for (const field of fields) {
        if (field.indicator) {
            output.indicator = field.name as any;
        }

        if (!options?.action) {
            continue;
        }

        if (field.actions.includes(options.action)) {
            (output.keys as any)[field.name] = true;

            if (options?.unit && field.name in options.unit) {
                (output.values as any)[field.name] = (options.unit as any)[field.name];
            }
        }
    }

    return output;
}
