# Harlemify

Schema-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

![Harlemify](https://raw.githubusercontent.com/diphyx/harlemify/main/docs/_media/icon.svg)

## Features

- Zod schema validation with field metadata
- Automatic API client with runtime config
- CRUD operations with endpoint status monitoring
- Lifecycle hooks and abort controller support
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
import { z } from "zod";
import { createStore, Endpoint, EndpointMethod } from "@diphyx/harlemify";

const UserSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PATCH],
    }),
});

export type User = z.infer<typeof UserSchema>;

export const userStore = createStore(
    "user",
    UserSchema,
    {
        [Endpoint.GET_UNITS]: {
            method: EndpointMethod.GET,
            url: "/users",
        },
        [Endpoint.POST_UNITS]: {
            method: EndpointMethod.POST,
            url: "/users",
        },
        [Endpoint.PATCH_UNITS]: {
            method: EndpointMethod.PATCH,
            url: (params) => `/users/${params.id}`,
        },
        [Endpoint.DELETE_UNITS]: {
            method: EndpointMethod.DELETE,
            url: (params) => `/users/${params.id}`,
        },
    },
    {
        indicator: "id",
        hooks: {
            before() {
                // Show loading indicator
            },
            after(error) {
                // Hide loading indicator, handle error if present
            },
        },
    },
);
```

## Documentation

Full documentation available at [https://diphyx.github.io/harlemify/](https://diphyx.github.io/harlemify/)

## License

MIT
