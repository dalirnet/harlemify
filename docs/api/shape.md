# shape

Creates a Zod object schema for use as a model shape.

## Signature

```typescript
function shape<T extends ShapeRawDefinition>(definition: T | ((factory: ShapeFactory) => T)): ShapeCall<T>;
```

## Parameters

| Parameter    | Type                                  | Description                          |
| ------------ | ------------------------------------- | ------------------------------------ |
| `definition` | `T \| ((factory: ShapeFactory) => T)` | A shape object or a factory function |

## Returns

A `ShapeCall<T>` (extends `ZodObject<T>`) that can be used with `one()` and `many()`. The returned object also includes a `.defaults()` method for generating zero-value objects.

## Usage

```typescript
const userShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
        email: factory.email(),
        active: factory.boolean(),
    };
});
```

## ShapeFactory

The factory callback provides access to all Zod types:

### Primitives

`string`, `number`, `boolean`, `bigint`, `date`

### Structures

`object`, `array`, `tuple`, `record`, `map`, `set`, `enum`, `union`, `literal`

### String Formats

`email`, `url`, `uuid`, `cuid`, `cuid2`, `ulid`, `nanoid`, `jwt`, `emoji`, `ipv4`, `ipv6`, `mac`, `base64`, `base64url`, `hex`

### Special

`any`, `unknown`, `never`, `nullable`, `optional`

## ShapeInfer

Extract the TypeScript type from a shape:

```typescript
import { type ShapeInfer } from "@diphyx/harlemify";

const userShape = shape((factory) => {
    return {
        id: factory.number(),
        name: factory.string(),
    };
});

type User = ShapeInfer<typeof userShape>;
// { id: number; name: string }
```

## Identifier Meta

The identifier is **optional**. It is only relevant for `many()` collection models where item matching is needed. Shapes used with `one()` models do not need an identifier.

Mark a field as the identifier for array matching:

```typescript
const userShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
    };
});
```

The identifier is used by `ModelManyMode.PATCH`, `ModelManyMode.REMOVE`, and the `unique` option in `ModelManyMode.ADD` to match items in arrays.

**Identifier resolution priority:**

1. `identifier` option passed to `many(shape, { identifier: "uuid" })`
2. Field marked with `.meta({ identifier: true })` in the shape
3. Field named `id` (if present in shape)
4. Field named `_id` (if present in shape)
5. Falls back to `"id"` (may fail at runtime if the field doesn't exist)

## defaults

Generates a zero-value object from a shape definition, with optional partial overrides.

Available as a method on shape instances created with `shape()`.

### Signature

```typescript
shape.defaults(overrides?: Partial<ShapeInfer<T>>): ShapeInfer<T>;
```

### Parameters

| Parameter   | Type                     | Description                                  |
| ----------- | ------------------------ | -------------------------------------------- |
| `overrides` | `Partial<ShapeInfer<T>>` | Optional partial object to override defaults |

### Returns

A fully populated object with zero-values for each field type.

### Zero-value mapping

| Field Type                        | Default Value              |
| --------------------------------- | -------------------------- |
| `string` (and all string formats) | `""`                       |
| `number`                          | `0`                        |
| `boolean`                         | `false`                    |
| `bigint`                          | `0n`                       |
| `date`                            | `new Date(0)`              |
| `array`                           | `[]`                       |
| `record`                          | `{}`                       |
| `map`                             | `new Map()`                |
| `set`                             | `new Set()`                |
| `enum`                            | First enum value           |
| `literal`                         | The literal value          |
| `union`                           | Zero-value of first option |
| `tuple`                           | Zero-values for each item  |
| `object`                          | Recursive defaults         |
| `optional` / `nullable`           | Zero-value of inner type   |
| `default`                         | The Zod default value      |

### Usage

```typescript
import { shape } from "@diphyx/harlemify";

const userShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    name: factory.string(),
    email: factory.email(),
    active: factory.boolean(),
    tags: factory.array(factory.string()),
}));

userShape.defaults();
// { id: 0, name: "", email: "", active: false, tags: [] }

// With overrides
userShape.defaults({ active: true, tags: ["new"] });
// { id: 0, name: "", email: "", active: true, tags: ["new"] }
```

### Nested shapes

```typescript
const profileShape = shape((factory) => ({
    id: factory.number(),
    settings: factory.object({
        theme: factory.enum(["light", "dark"]),
        notifications: factory.boolean(),
    }),
}));

profileShape.defaults();
// { id: 0, settings: { theme: "light", notifications: false } }
```

## See Also

- [createStore](create-store.md) - Use shapes in store definitions
- [Types](types.md) - Complete type reference
