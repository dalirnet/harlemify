# Harlemify

API state management for Nuxt powered by [Harlem](https://harlemjs.com/)

![Harlemify](https://raw.githubusercontent.com/diphyx/harlemify/main/docs/_media/icon.svg)

## Features

- Zod schema validation with field metadata
- Automatic API client with runtime config
- CRUD operations with endpoint status tracking
- Type-safe endpoint URL parameters
- SSR support via Harlem SSR plugin

## Installation

```bash
npm install @diphyx/harlemify
```

## Quick Start

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        api: {
            url: "https://api.example.com",
        },
    },
});
```

```typescript
// stores/user.ts
import { z, createStore, Endpoint, ApiAction } from "@diphyx/harlemify";

const UserSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PATCH],
    }),
});

export type User = z.infer<typeof UserSchema>;

export const userStore = createStore("user", UserSchema, {
    [Endpoint.GET_UNITS]: {
        action: ApiAction.GET,
        url: "/users",
    },
    [Endpoint.POST_UNITS]: {
        action: ApiAction.POST,
        url: "/users",
    },
    [Endpoint.PATCH_UNITS]: {
        action: ApiAction.PATCH,
        url: (params) => `/users/${params.id}`,
    },
    [Endpoint.DELETE_UNITS]: {
        action: ApiAction.DELETE,
        url: (params) => `/users/${params.id}`,
    },
});
```

## Documentation

Full documentation available at [https://diphyx.github.io/harlemify/](https://diphyx.github.io/harlemify/)

## License

MIT
