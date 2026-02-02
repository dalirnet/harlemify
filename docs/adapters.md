# Custom Adapters

Harlemify uses adapters to handle HTTP requests. You can customize request behavior at different levels for advanced use cases like streaming, file uploads, or custom authentication.

## Adapter Hierarchy

Adapters are resolved in the following order (highest to lowest priority):

1. **Endpoint adapter** - Per-endpoint custom adapter
2. **Store adapter** - Store-level adapter option
3. **Module adapter** - Global config in `nuxt.config.ts`
4. **Default adapter** - Built-in fetch adapter

## Built-in Adapter

Use `defineApiAdapter` to create an adapter with custom options:

```typescript
import { defineApiAdapter } from "@diphyx/harlemify";

const customAdapter = defineApiAdapter({
    baseURL: "/api",
    timeout: 5000,
    retry: 3,
    retryDelay: 1000,
    retryStatusCodes: [500, 502, 503],
    responseType: "json",
});
```

### Adapter Options

| Option             | Type              | Description                                   |
| ------------------ | ----------------- | --------------------------------------------- |
| `baseURL`          | `string`          | Base URL for requests                         |
| `timeout`          | `number`          | Request timeout in ms                         |
| `retry`            | `number \| false` | Number of retries (false to disable)          |
| `retryDelay`       | `number`          | Delay between retries in ms                   |
| `retryStatusCodes` | `number[]`        | HTTP status codes to retry                    |
| `responseType`     | `string`          | Response type (json, text, blob, arrayBuffer) |

## Custom Adapter

Create a fully custom adapter for advanced scenarios:

```typescript
import type { ApiAdapter, ApiAdapterRequest } from "@diphyx/harlemify";

const customAdapter: ApiAdapter<MyType> = async (request: ApiAdapterRequest) => {
    console.log(`Fetching: ${request.url}`);

    const response = await fetch(`https://api.example.com${request.url}`, {
        method: request.method,
        headers: request.headers as HeadersInit,
        body: request.body ? JSON.stringify(request.body) : undefined,
    });

    const data = await response.json();
    return { data, status: response.status };
};
```

### ApiAdapterRequest

The request object passed to adapters:

```typescript
interface ApiAdapterRequest {
    method: EndpointMethod;    // HTTP method
    url: string;               // Request URL
    body?: unknown;            // Request body
    query?: Record<string, unknown>;  // Query parameters
    headers?: Record<string, string>; // Request headers
    signal?: AbortSignal;      // Abort signal for cancellation
}
```

### ApiAdapterResponse

The response object returned by adapters:

```typescript
interface ApiAdapterResponse<T> {
    data: T;          // Response data
    status?: number;  // HTTP status code
}
```

## Usage Examples

### Module-Level (nuxt.config.ts)

Configure default adapter options for all stores:

```typescript
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        api: {
            headers: {
                "X-Custom-Header": "value",
            },
            query: {
                apiKey: "your-api-key",
            },
            adapter: {
                baseURL: "https://api.example.com",
                timeout: 10000,
                retry: 3,
            },
        },
    },
});
```

### Store-Level

Apply an adapter to all endpoints in a store:

```typescript
import { defineApiAdapter } from "@diphyx/harlemify";

const storeAdapter = defineApiAdapter({
    baseURL: "/api",
    timeout: 5000,
});

export const userStore = createStore(
    "user",
    UserSchema,
    {
        [Endpoint.GET_UNITS]: { method: EndpointMethod.GET, url: "/users" },
        [Endpoint.POST_UNITS]: { method: EndpointMethod.POST, url: "/users" },
    },
    {
        adapter: storeAdapter,
    },
);
```

### Endpoint-Level

Override the adapter for specific endpoints:

```typescript
import type { ApiAdapter } from "@diphyx/harlemify";

// Custom adapter with longer timeout
const detailAdapter: ApiAdapter<User> = async (request) => {
    const data = await $fetch<User>(request.url, {
        baseURL: "/api",
        method: request.method,
        headers: request.headers as HeadersInit,
        query: request.query,
        timeout: 30000,
    });
    return { data };
};

export const userStore = createStore("user", UserSchema, {
    [Endpoint.GET_UNIT]: {
        method: EndpointMethod.GET,
        url: (params) => `/users/${params.id}`,
        adapter: detailAdapter,  // Custom adapter
    },
    [Endpoint.GET_UNITS]: {
        method: EndpointMethod.GET,
        url: "/users",
        // Uses store or global adapter
    },
});
```

## Advanced Examples

### Streaming Adapter

```typescript
const streamingAdapter: ApiAdapter<string> = async (request) => {
    const response = await fetch(`/api${request.url}`, {
        method: request.method,
        headers: request.headers as HeadersInit,
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let result = "";

    while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
    }

    return { data: result, status: response.status };
};
```

### Authentication Adapter

```typescript
const authAdapter: ApiAdapter<any> = async (request) => {
    const token = localStorage.getItem("auth_token");

    const headers = {
        ...request.headers,
        Authorization: token ? `Bearer ${token}` : "",
    };

    const data = await $fetch(request.url, {
        baseURL: "/api",
        method: request.method,
        headers,
        body: request.body,
        query: request.query,
    });

    return { data };
};
```

### File Upload Adapter

```typescript
const uploadAdapter: ApiAdapter<UploadResult> = async (request) => {
    const formData = request.body as FormData;

    const response = await fetch(`/api${request.url}`, {
        method: "POST",
        body: formData,
        headers: request.headers as HeadersInit,
    });

    const data = await response.json();
    return { data, status: response.status };
};
```

## TypeScript Types

```typescript
// Adapter function signature
type ApiAdapter<T = unknown> = (
    request: ApiAdapterRequest
) => Promise<ApiAdapterResponse<T>>;

// Adapter factory type
type DefineApiAdapter<T = unknown, O = unknown> = (
    options?: O
) => ApiAdapter<T>;

// Built-in adapter options
interface ApiFetchAdapterOptions {
    baseURL?: string;
    timeout?: number;
    retry?: number | false;
    retryDelay?: number;
    retryStatusCodes?: number[];
    responseType?: "json" | "text" | "blob" | "arrayBuffer";
}
```
