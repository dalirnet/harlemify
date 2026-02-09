import { defu } from "defu";
import { z } from "zod";

import type {
    ShapeCall,
    ShapeDefinition,
    ShapeFieldDefinition,
    ShapeInfer,
    ShapeResolved,
    ShapeRawDefinition,
    ShapeType,
    ZodFieldDefinition,
} from "../types/shape";
import { isPlainObject, isEmptyRecord } from "./base";

// Zero-value resolvers (primitives)

function resolveStringZeroValue(): string {
    return "";
}

function resolveNumberZeroValue(): number {
    return 0;
}

function resolveBooleanZeroValue(): boolean {
    return false;
}

function resolveBigintZeroValue(): bigint {
    return BigInt(0);
}

function resolveDateZeroValue(): Date {
    return new Date(0);
}

// Zero-value resolvers (collections)

function resolveArrayZeroValue(): unknown[] {
    return [];
}

function resolveRecordZeroValue(): Record<string, unknown> {
    return {};
}

function resolveMapZeroValue(): Map<unknown, unknown> {
    return new Map();
}

function resolveSetZeroValue(): Set<unknown> {
    return new Set();
}

// Zero-value resolvers (structures)

function resolveObjectZeroValue(definition: ZodFieldDefinition): Record<string, unknown> {
    const output: Record<string, unknown> = {};

    if (definition.shape) {
        for (const [key, value] of Object.entries(definition.shape)) {
            output[key] = resolveZeroValue(value);
        }
    }

    return output;
}

function resolveEnumZeroValue(definition: ZodFieldDefinition): unknown {
    if (definition.entries) {
        return Object.values(definition.entries)[0];
    }

    return undefined;
}

function resolveLiteralZeroValue(definition: ZodFieldDefinition): unknown {
    if (definition.values) {
        return definition.values[0];
    }

    return undefined;
}

function resolveTupleZeroValue(definition: ZodFieldDefinition): unknown[] {
    if (definition.items) {
        return definition.items.map(resolveZeroValue);
    }

    return [];
}

function resolveUnionZeroValue(definition: ZodFieldDefinition): unknown {
    if (definition.options?.[0]) {
        return resolveZeroValue(definition.options[0]);
    }

    return undefined;
}

// Zero-value resolvers (wrappers)

function resolveDefaultZeroValue(definition: ZodFieldDefinition): unknown {
    if (typeof definition.defaultValue === "function") {
        return definition.defaultValue();
    }

    return definition.defaultValue;
}

function resolveInnerZeroValue(definition: ZodFieldDefinition): unknown {
    if (definition.innerType) {
        return resolveZeroValue(definition.innerType);
    }

    return undefined;
}

// Zero-value resolver (entry point)

function resolveZeroValue(field: ShapeType<unknown>): unknown {
    const definition = (field as ShapeType<unknown> & { def?: ZodFieldDefinition }).def;

    if (!definition?.type) {
        return undefined;
    }

    switch (definition.type) {
        case "string": {
            return resolveStringZeroValue();
        }
        case "number": {
            return resolveNumberZeroValue();
        }
        case "boolean": {
            return resolveBooleanZeroValue();
        }
        case "bigint": {
            return resolveBigintZeroValue();
        }
        case "date": {
            return resolveDateZeroValue();
        }
        case "array": {
            return resolveArrayZeroValue();
        }
        case "record": {
            return resolveRecordZeroValue();
        }
        case "map": {
            return resolveMapZeroValue();
        }
        case "set": {
            return resolveSetZeroValue();
        }
        case "object": {
            return resolveObjectZeroValue(definition);
        }
        case "enum": {
            return resolveEnumZeroValue(definition);
        }
        case "literal": {
            return resolveLiteralZeroValue(definition);
        }
        case "tuple": {
            return resolveTupleZeroValue(definition);
        }
        case "union": {
            return resolveUnionZeroValue(definition);
        }
        case "default": {
            return resolveDefaultZeroValue(definition);
        }
        case "optional":
        case "nullable": {
            return resolveInnerZeroValue(definition);
        }
        default: {
            return undefined;
        }
    }
}

// Exported functions

export function resolveShape(shape: ShapeDefinition): ShapeResolved {
    const resolved: ShapeResolved = {
        identifier: undefined,
        defaults: {},
        fields: [],
        aliases: {},
    };

    for (const [key, field] of Object.entries(shape.shape)) {
        resolved.fields.push(key);

        const fieldMeta = (
            field as ShapeType<unknown> & { meta: () => ShapeFieldDefinition["meta"] | undefined }
        ).meta();

        if (fieldMeta?.identifier) {
            resolved.identifier = key;
        }

        if (fieldMeta?.alias) {
            resolved.aliases[key] = fieldMeta.alias as string;
        }

        const fieldDefinition = (field as ShapeType<unknown> & { def?: ShapeFieldDefinition }).def;

        if (fieldDefinition?.defaultValue !== undefined) {
            if (typeof fieldDefinition.defaultValue === "function") {
                resolved.defaults[key] = fieldDefinition.defaultValue();

                continue;
            }

            resolved.defaults[key] = fieldDefinition.defaultValue;
        }
    }

    if (!resolved.identifier) {
        if (resolved.fields.includes("id")) {
            resolved.identifier = "id";
        } else if (resolved.fields.includes("_id")) {
            resolved.identifier = "_id";
        }
    }

    return resolved;
}

// Alias resolvers

function resolveAliasObject(data: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
        output[mapping[key] ?? key] = value;
    }

    return output;
}

export function resolveAliasInbound<T = unknown>(data: T, aliases?: Record<string, string>): T {
    if (isEmptyRecord(aliases)) {
        return data;
    }

    const reverse: Record<string, string> = {};
    for (const [shapeKey, aliasKey] of Object.entries(aliases)) {
        reverse[aliasKey] = shapeKey;
    }

    if (Array.isArray(data)) {
        return data.map((item) => {
            if (isPlainObject(item)) {
                return resolveAliasObject(item, reverse);
            }

            return item;
        }) as T;
    }

    if (isPlainObject(data)) {
        return resolveAliasObject(data, reverse) as T;
    }

    return data;
}

export function resolveAliasOutbound<T = unknown>(data: T, aliases?: Record<string, string>): T {
    if (isEmptyRecord(aliases)) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map((item) => {
            if (isPlainObject(item)) {
                return resolveAliasObject(item, aliases);
            }

            return item;
        }) as T;
    }

    if (isPlainObject(data)) {
        return resolveAliasObject(data, aliases) as T;
    }

    return data;
}

export function resolveDefaults<T extends ShapeDefinition>(
    shape: T,
    overrides?: Partial<ShapeInfer<T>>,
): ShapeInfer<T> {
    const output: Record<string, unknown> = {};

    for (const [key, field] of Object.entries(shape.shape)) {
        output[key] = resolveZeroValue(field as ShapeType<unknown>);
    }

    if (overrides) {
        return defu(overrides, output) as ShapeInfer<T>;
    }

    return output as ShapeInfer<T>;
}

export function createShape<T extends ShapeRawDefinition>(definition: T): ShapeCall<T> {
    const object = z.object(definition);

    const shape = Object.assign(object, {
        defaults(overrides?: Partial<ShapeInfer<typeof object>>) {
            return resolveDefaults(object, overrides);
        },
    });

    return shape;
}
