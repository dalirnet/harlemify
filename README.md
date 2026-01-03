# Harlemify

API state management for Nuxt powered by [Harlem](https://harlemjs.com/)

Harlemify simplifies building data-driven Nuxt applications by combining Zod schema validation with Harlem's reactive state management. Define your data models once with field metadata, and get automatic API integration, request status tracking, and record caching out of the box.

## Features

- ✅ Zod schema validation with field metadata
- ⚡ Automatic API client with runtime config
- 📊 CRUD operations with endpoint status tracking
- 🖥️ SSR support via Harlem SSR plugin

## Installation

```bash
npm install harlemify
```

## Setup

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["harlemify"],
    harlemify: {
        api: {
            url: "https://api.example.com",
            timeout: 10000,
        },
    },
});
```

## Usage

### Creating a Store

```typescript
// stores/user.ts
import { z, createStore, StoreEndpoint, ApiAction } from "harlemify";

const UserSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PUT],
    }),
    email: z.string().meta({
        actions: [ApiAction.POST],
    }),
});

export const userStore = createStore("user", UserSchema, {
    [StoreEndpoint.GET_RECORD]: {
        action: ApiAction.GET,
        url(params) {
            return `/users/${params.id}`;
        },
    },
    [StoreEndpoint.GET_RECORDS]: {
        action: ApiAction.GET,
        url: "/users",
    },
    [StoreEndpoint.POST_RECORD]: {
        action: ApiAction.POST,
        url: "/users",
    },
    [StoreEndpoint.PUT_RECORD]: {
        action: ApiAction.PUT,
        url(params) {
            return `/users/${params.id}`;
        },
    },
    [StoreEndpoint.PATCH_RECORD]: {
        action: ApiAction.PATCH,
        url(params) {
            return `/users/${params.id}`;
        },
    },
    [StoreEndpoint.DELETE_RECORD]: {
        action: ApiAction.DELETE,
        url(params) {
            return `/users/${params.id}`;
        },
    },
});
```

### Using in Components

```vue
<script setup>
import { userStore } from "~/stores/user";

const { cachedRecords, endpointsStatus, getRecords, postRecord, deleteRecord } =
    userStore;

await getRecords();
</script>

<template>
    <div v-if="endpointsStatus.getRecordsIsPending.value">Loading...</div>
    <div v-else-if="endpointsStatus.getRecordsIsFailed.value">
        Error loading users
    </div>
    <ul v-else>
        <li v-for="user in cachedRecords.value" :key="user.id">
            {{ user.name }}
        </li>
    </ul>
</template>
```

### Schema Field Metadata

Use `.meta()` to configure field behavior:

```typescript
z.object({
    // Mark as primary key (used for record identification)
    id: z.number().meta({
        indicator: true,
    }),

    // Include in POST and PUT request bodies
    name: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PUT],
    }),

    // Include only in POST request body
    email: z.string().meta({
        actions: [ApiAction.POST],
    }),

    // No meta = not included in request bodies
    createdAt: z.string(),
});
```

### Endpoint Status Tracking

Each endpoint has status getters:

```typescript
const { endpointsStatus } = userStore;

// Check if getRecords is pending
if (endpointsStatus.getRecordsIsPending.value) {
    // show loading
}

// Check if getRecords failed
if (endpointsStatus.getRecordsIsFailed.value) {
    // show error
}

// Check if getRecords succeeded
if (endpointsStatus.getRecordsIsSuccess.value) {
    // show data
}

// Available for all endpoints:
// getRecordIsIdle, getRecordIsPending, getRecordIsSuccess, getRecordIsFailed
// getRecordsIsIdle, getRecordsIsPending, getRecordsIsSuccess, getRecordsIsFailed
// postRecordIsIdle, postRecordIsPending, postRecordIsSuccess, postRecordIsFailed
// ... and so on for PUT, PATCH, DELETE
```

### Cache Mutations

Manually manipulate cached data:

```typescript
const {
    cachedRecord,
    cachedRecords,
    putCachedRecord,
    putCachedRecords,
    patchCachedRecord,
    patchCachedRecords,
    pushCachedRecords,
    pullCachedRecords,
    purgeCachedRecord,
    purgeCachedRecords,
} = userStore;

// Replace single record
putCachedRecord({ id: 1, name: "John", email: "john@example.com" });

// Replace all records
putCachedRecords([
    { id: 1, name: "John", email: "john@example.com" },
    { id: 2, name: "Jane", email: "jane@example.com" },
]);

// Merge into single record
patchCachedRecord({ id: 1, name: "John Doe" });

// Merge into matching records
patchCachedRecords({ id: 1, name: "John Doe" }, { id: 2, name: "Jane Doe" });

// Add records to cache
pushCachedRecords({ id: 3, name: "Bob", email: "bob@example.com" });

// Remove records from cache
pullCachedRecords({ id: 1 });

// Clear single record
purgeCachedRecord();

// Clear all records
purgeCachedRecords();
```

### Per-Store API Options

Override module API options for specific stores:

```typescript
const userStore = createStore("user", UserSchema, endpoints, {
    api: {
        url: "https://other-api.example.com",
        timeout: 5000,
    },
});
```

### Standalone API Client

Use `createApi` for standalone API calls:

```typescript
import { createApi } from "harlemify";

const api = createApi({
    url: "https://api.example.com",
    timeout: 10000,
    headers: {
        Authorization: "Bearer token",
    },
});

const users = await api.get("/users");
const user = await api.post("/users", { body: { name: "John" } });
await api.put("/users/1", { body: { name: "John Doe" } });
await api.patch("/users/1", { body: { name: "Johnny" } });
await api.del("/users/1");
```

## API Reference

### Module Options

| Option        | Type     | Default     | Description                     |
| ------------- | -------- | ----------- | ------------------------------- |
| `api.url`     | `string` | `undefined` | Base URL for API requests       |
| `api.timeout` | `number` | `undefined` | Request timeout in milliseconds |

### createStore(name, schema, endpoints?, options?)

| Parameter            | Type                      | Description                    |
| -------------------- | ------------------------- | ------------------------------ |
| `name`               | `string`                  | Store name                     |
| `schema`             | `z.ZodObject`             | Zod schema with field metadata |
| `endpoints`          | `StoreEndpointDefinition` | Endpoint definitions           |
| `options.api`        | `ApiOptions`              | Override API options           |
| `options.extensions` | `Extension[]`             | Harlem extensions              |

### StoreEndpoint

| Value            | Description         |
| ---------------- | ------------------- |
| `GET_RECORD`     | Fetch single record |
| `GET_RECORDS`    | Fetch all records   |
| `POST_RECORD`    | Create record       |
| `POST_RECORDS`   | Create records      |
| `PUT_RECORD`     | Replace record      |
| `PUT_RECORDS`    | Replace records     |
| `PATCH_RECORD`   | Update record       |
| `PATCH_RECORDS`  | Update records      |
| `DELETE_RECORD`  | Delete record       |
| `DELETE_RECORDS` | Delete records      |

### StoreEndpointStatus

| Value     | Description         |
| --------- | ------------------- |
| `IDLE`    | No request made yet |
| `PENDING` | Request in progress |
| `SUCCESS` | Request completed   |
| `FAILED`  | Request failed      |

### ApiAction

| Value    | Description    |
| -------- | -------------- |
| `GET`    | GET request    |
| `POST`   | POST request   |
| `PUT`    | PUT request    |
| `PATCH`  | PATCH request  |
| `DELETE` | DELETE request |

### StoreSchemaMeta

| Property    | Type          | Description                           |
| ----------- | ------------- | ------------------------------------- |
| `indicator` | `boolean`     | Mark field as primary key             |
| `actions`   | `ApiAction[]` | Include field in these request bodies |

## License

MIT
