# Harlemify

> Schema-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

![Harlemify](https://raw.githubusercontent.com/diphyx/harlemify/main/docs/_media/icon.svg)

Define your data schema once with Zod, and Harlemify handles the rest: type-safe API calls, reactive state, request monitoring, and automatic memory management. Your schema becomes the single source of truth for types, validation, and API payloads.

## Features

- **Schema-Driven** - Zod schema defines types, validation, and API payloads
- **Automatic API Client** - Built-in HTTP client with runtime configuration
- **Reactive Memory** - Unit and collection caching with Vue reactivity
- **Request Monitoring** - Track pending, success, and failed states
- **SSR Support** - Server-side rendering via Harlem SSR plugin

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
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PATCH],
    }),
});

export type User = z.infer<typeof UserSchema>;

export const userStore = createStore("user", UserSchema, {
    [Endpoint.GET_UNITS]: { method: EndpointMethod.GET, url: "/users" },
    [Endpoint.POST_UNITS]: { method: EndpointMethod.POST, url: "/users" },
    [Endpoint.PATCH_UNITS]: { method: EndpointMethod.PATCH, url: (p) => `/users/${p.id}` },
    [Endpoint.DELETE_UNITS]: { method: EndpointMethod.DELETE, url: (p) => `/users/${p.id}` },
});
```

## Why Harlemify?

|                 |                                                   |
| --------------- | ------------------------------------------------- |
| **Type-Safe**   | Full TypeScript support with Zod schema inference |
| **Declarative** | Define schema once, derive everything else        |
| **Reactive**    | Powered by Vue's reactivity through Harlem        |
| **Simple**      | Minimal boilerplate, maximum productivity         |

## Documentation

Full documentation available at [https://diphyx.github.io/harlemify/](https://diphyx.github.io/harlemify/)

## License

MIT
