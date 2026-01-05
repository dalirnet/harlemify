# API Reference

## Module Options

Configure harlemify in your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        api: {
            url: "https://api.example.com",
            timeout: 10000,
        },
    },
});
```

| Option        | Type     | Default     | Description                     |
| ------------- | -------- | ----------- | ------------------------------- |
| `api.url`     | `string` | `undefined` | Base URL for API requests       |
| `api.timeout` | `number` | `undefined` | Request timeout in milliseconds |

## createStore

Creates a new store with API integration and state management.

```typescript
createStore(name, schema, endpoints?, options?)
```

| Parameter            | Type                 | Description                         |
| -------------------- | -------------------- | ----------------------------------- |
| `name`               | `string`             | Unique store name                   |
| `schema`             | `z.ZodObject`        | Zod schema with field metadata      |
| `endpoints`          | `EndpointDefinition` | Endpoint definitions                |
| `options.api`        | `ApiOptions`         | Override API options for this store |
| `options.indicator`  | `string`             | Override the primary key field name |
| `options.hooks`      | `StoreHooks`         | Lifecycle hooks (before/after)      |
| `options.extensions` | `Extension[]`        | Harlem extensions                   |

### Returns

| Property              | Type          | Description                      |
| --------------------- | ------------- | -------------------------------- |
| `api`                 | `ApiClient`   | API client instance              |
| `store`               | `HarlemStore` | Underlying Harlem store          |
| `memorizedUnit`       | `ComputedRef` | Single cached unit               |
| `memorizedUnits`      | `ComputedRef` | Cached unit collection           |
| `hasMemorizedUnits`   | `Function`    | Check if units exist in memory   |
| `endpointsStatus`     | `Object`      | Status getters for all endpoints |
| `setMemorizedUnit`    | `Mutation`    | Set single unit                  |
| `setMemorizedUnits`   | `Mutation`    | Set unit collection              |
| `editMemorizedUnit`   | `Mutation`    | Merge into single unit           |
| `editMemorizedUnits`  | `Mutation`    | Merge into units in collection   |
| `dropMemorizedUnit`   | `Mutation`    | Remove single unit               |
| `dropMemorizedUnits`  | `Mutation`    | Remove units from collection     |
| `getUnit`             | `Action`      | Fetch single unit                |
| `getUnits`            | `Action`      | Fetch unit collection            |
| `postUnit`            | `Action`      | Create single unit               |
| `postUnits`           | `Action`      | Create multiple units            |
| `putUnit`             | `Action`      | Replace single unit              |
| `putUnits`            | `Action`      | Replace multiple units           |
| `patchUnit`           | `Action`      | Partially update single unit     |
| `patchUnits`          | `Action`      | Partially update multiple units  |
| `deleteUnit`          | `Action`      | Delete single unit               |
| `deleteUnits`         | `Action`      | Delete multiple units            |
| `patchEndpointMemory` | `Mutation`    | Update endpoint memory directly  |
| `purgeEndpointMemory` | `Mutation`    | Clear all endpoint memory        |

### Action Options

All store actions accept an optional options parameter:

```typescript
interface ActionOptions {
    headers?: MaybeRefOrGetter<Record<string, unknown>>;
    query?: MaybeRefOrGetter<Record<string, unknown>>;
    body?: MaybeRefOrGetter<any>;
    timeout?: number;
    responseType?: ApiResponseType;
    retry?: number | false;
    retryDelay?: number;
    retryStatusCodes?: number[];
    signal?: AbortSignal;
    validate?: boolean;
}
```

| Option     | Type      | Default | Description                                     |
| ---------- | --------- | ------- | ----------------------------------------------- |
| `validate` | `boolean` | `false` | Validate unit against schema before API request |

When `validate: true` is passed, the unit is validated against the Zod schema before sending to the API. Only fields with the current action in their `meta.actions` are validated. For `PATCH` operations, partial validation is used.

```typescript
// Validates fields with ApiAction.POST in their meta.actions
await postUnit({ id: 1, name: "John" }, { validate: true });

// Validates partial schema for PATCH
await patchUnit({ id: 1, name: "Jane" }, { validate: true });
```

## createApi

Creates a standalone API client.

```typescript
createApi(options?)
```

| Option    | Type                       | Description              |
| --------- | -------------------------- | ------------------------ |
| `url`     | `string`                   | Base URL                 |
| `timeout` | `number`                   | Request timeout in ms    |
| `headers` | `MaybeRefOrGetter<Record>` | Default request headers  |
| `query`   | `MaybeRefOrGetter<Record>` | Default query parameters |

### Methods

```typescript
const api = createApi({
    url: "https://api.example.com"
});

// GET request
await api.get<T>(url, options?)

// POST request
await api.post<T>(url, options?)

// PUT request
await api.put<T>(url, options?)

// PATCH request
await api.patch<T>(url, options?)

// DELETE request
await api.del<T>(url, options?)
```

## Enums

### ApiAction

```typescript
enum ApiAction {
    GET = "get",
    POST = "post",
    PUT = "put",
    PATCH = "patch",
    DELETE = "delete",
}
```

### Endpoint

```typescript
enum Endpoint {
    GET_UNIT = "getUnit",
    GET_UNITS = "getUnits",
    POST_UNIT = "postUnit",
    POST_UNITS = "postUnits",
    PUT_UNIT = "putUnit",
    PUT_UNITS = "putUnits",
    PATCH_UNIT = "patchUnit",
    PATCH_UNITS = "patchUnits",
    DELETE_UNIT = "deleteUnit",
    DELETE_UNITS = "deleteUnits",
}
```

### EndpointStatus

```typescript
enum EndpointStatus {
    IDLE = "idle",
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed",
}
```

### StoreMemoryPosition

Used with `postUnits` to control where new items are added in memory.

```typescript
enum StoreMemoryPosition {
    FIRST = "first",
    LAST = "last",
}
```

| Value   | Description                              |
| ------- | ---------------------------------------- |
| `FIRST` | Add new items at the beginning (default) |
| `LAST`  | Add new items at the end                 |

```typescript
import { StoreMemoryPosition } from "@diphyx/harlemify";

// Add at beginning (default)
await postUnits([{ id: 0, name: "New" }]);

// Add at end
await postUnits([{ id: 0, name: "New" }], {
    position: StoreMemoryPosition.LAST,
});
```

## Types

### StoreOptions

```typescript
interface StoreOptions {
    api?: ApiOptions;
    indicator?: string;
    hooks?: StoreHooks;
    extensions?: Extension<BaseState>[];
}
```

| Property     | Type          | Description                         |
| ------------ | ------------- | ----------------------------------- |
| `api`        | `ApiOptions`  | Override API options for this store |
| `indicator`  | `string`      | Override the primary key field name |
| `hooks`      | `StoreHooks`  | Lifecycle hooks for API operations  |
| `extensions` | `Extension[]` | Harlem extensions                   |

### StoreHooks

```typescript
interface StoreHooks {
    before?: () => Promise<void> | void;
    after?: (error?: Error) => Promise<void> | void;
}
```

| Property | Type                                       | Description                       |
| -------- | ------------------------------------------ | --------------------------------- |
| `before` | `() => Promise<void> \| void`              | Called before every API operation |
| `after`  | `(error?: Error) => Promise<void> \| void` | Called after every API operation  |

The `after` hook receives an `Error` parameter if the operation failed, or `undefined` if it succeeded.

### SchemaMeta

```typescript
interface SchemaMeta {
    indicator?: boolean;
    actions?: ApiAction[];
}
```

### EndpointDefinition

```typescript
interface EndpointDefinition<T = Record<string, unknown>> {
    action: ApiAction;
    url: string | ((params: T) => string);
}
```

When used with `createStore`, the type `T` is automatically inferred from your schema, providing full type safety for URL parameters:

```typescript
// params is typed as Partial<Product>
url: (params) => `/products/${params.id}`,
```

### ApiRequestOptions

```typescript
interface ApiRequestOptions {
    headers?: MaybeRefOrGetter<Record<string, unknown>>;
    query?: MaybeRefOrGetter<Record<string, unknown>>;
    body?: MaybeRefOrGetter<any>;
    timeout?: number;
    responseType?: ApiResponseType;
    retry?: number | false;
    retryDelay?: number;
    retryStatusCodes?: number[];
    signal?: AbortSignal;
}
```

| Option             | Type               | Default                | Description                           |
| ------------------ | ------------------ | ---------------------- | ------------------------------------- |
| `headers`          | `MaybeRefOrGetter` | `undefined`            | Request headers                       |
| `query`            | `MaybeRefOrGetter` | `undefined`            | Query parameters                      |
| `body`             | `MaybeRefOrGetter` | `undefined`            | Request body (POST, PUT, PATCH)       |
| `timeout`          | `number`           | `undefined`            | Request timeout in milliseconds       |
| `responseType`     | `ApiResponseType`  | `JSON`                 | Expected response format              |
| `retry`            | `number \| false`  | `false`                | Number of retry attempts              |
| `retryDelay`       | `number`           | `0`                    | Delay between retries in milliseconds |
| `retryStatusCodes` | `number[]`         | `[500, 502, 503, 504]` | HTTP status codes to retry on         |
| `signal`           | `AbortSignal`      | `undefined`            | Signal for request cancellation       |

### ApiResponseType

```typescript
enum ApiResponseType {
    JSON = "json",
    TEXT = "text",
    BLOB = "blob",
    ARRAY_BUFFER = "arrayBuffer",
}
```

| Type           | Description                      |
| -------------- | -------------------------------- |
| `JSON`         | Parse response as JSON (default) |
| `TEXT`         | Return response as plain text    |
| `BLOB`         | Return response as Blob          |
| `ARRAY_BUFFER` | Return response as ArrayBuffer   |

## Errors

Harlemify provides structured error classes for handling API and configuration failures.

### StoreConfigurationError

Thrown when the store fails to initialize (e.g., missing runtime config).

```typescript
class StoreConfigurationError extends Error {
    name: "StoreConfigurationError";
}
```

### ApiError (Base Class)

```typescript
class ApiError extends Error {
    source: ApiErrorSource;
    method: string;
    url: string;
}
```

### ApiErrorSource

```typescript
enum ApiErrorSource {
    REQUEST = "request",
    RESPONSE = "response",
}
```

### ApiRequestError

Thrown when a request fails before reaching the server (network error, timeout, etc.).

```typescript
class ApiRequestError extends ApiError {
    source: ApiErrorSource.REQUEST;
    method: string;
    url: string;
    message: string;
}
```

### ApiResponseError

Thrown when the server returns an error response (4xx, 5xx status codes).

```typescript
class ApiResponseError extends ApiError {
    source: ApiErrorSource.RESPONSE;
    status: number;
    statusText: string;
    data: unknown;
}
```

### Error Handling Example

```typescript
import { ApiRequestError, ApiResponseError } from "@diphyx/harlemify";

try {
    await getUnits();
} catch (error) {
    if (error instanceof ApiResponseError) {
        // Server returned an error
        console.error(`HTTP ${error.status}: ${error.statusText}`);
        console.error("Response data:", error.data);
    } else if (error instanceof ApiRequestError) {
        // Request failed (network, timeout, etc.)
        console.error(`Request failed: ${error.message}`);
    }
}
```
