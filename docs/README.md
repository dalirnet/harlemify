# Harlemify

> Schema-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

Harlemify simplifies building data-driven Nuxt applications by combining Zod schema validation with Harlem's reactive state management. Define your data models once with field metadata, and get automatic API integration, request status monitoring, and unit caching out of the box.

## Features

- **Schema-Driven** - Zod schema as the single source of truth for types, validation, and API payloads
- **Automatic API Client** - Built-in HTTP client with runtime configuration
- **CRUD Operations** - Complete endpoint status monitoring for all operations
- **Lifecycle Hooks** - Execute code before/after every API operation
- **SSR Support** - Server-side rendering via Harlem SSR plugin

## Quick Start

```bash
npm install @diphyx/harlemify
```

```typescript
// nuxt.config.ts
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

## Why Harlemify?

- **Type-Safe** - Full TypeScript support with Zod schema inference
- **Declarative** - Define your schema once, derive everything else
- **Reactive** - Powered by Vue's reactivity system through Harlem
- **Simple** - Minimal boilerplate, maximum productivity
