import type { z } from "zod";

export type SchemaShape = z.ZodRawShape;
export type SchemaObject<T extends SchemaShape = SchemaShape> = z.ZodObject<T>;
export type SchemaInfer<T extends SchemaShape = SchemaShape> = z.infer<z.ZodObject<T>>;

export interface SchemaFieldMeta<A extends string = string> {
    indicator?: boolean;
    actions?: A[];
}

export interface SchemaField<A extends string = string> {
    name: string;
    indicator: boolean;
    actions: A[];
}

export interface Schema<T extends SchemaShape, A extends string = string> {
    schema: SchemaObject<T>;
    getFieldMeta(field: any): SchemaFieldMeta<A> | undefined;
    getFields(): SchemaField<A>[];
    getActionFields(action: A): string[];
}

const fieldsCache = new WeakMap<SchemaObject, SchemaField[]>();

export function createSchema<T extends SchemaShape, A extends string = string>(schema: SchemaObject<T>): Schema<T, A> {
    function getFieldMeta(field: any): SchemaFieldMeta<A> | undefined {
        return (field as z.ZodType).meta() as any;
    }

    function getFields(): SchemaField<A>[] {
        const cached = fieldsCache.get(schema);
        if (cached) {
            return cached as SchemaField<A>[];
        }

        const fields: SchemaField<A>[] = [];

        for (const key in schema.shape) {
            const meta = getFieldMeta(schema.shape[key]);

            fields.push({
                name: key,
                indicator: meta?.indicator ?? false,
                actions: (meta?.actions as A[]) ?? [],
            });
        }

        fieldsCache.set(schema, fields);

        return fields;
    }

    function getActionFields(action: A): string[] {
        const fields: string[] = [];

        for (const key in schema.shape) {
            const meta = getFieldMeta(schema.shape[key]);

            if (meta?.actions?.includes(action)) {
                fields.push(key);
            }
        }

        return fields;
    }

    return {
        schema,
        getFieldMeta,
        getFields,
        getActionFields,
    };
}
