# Compose

Compose defines orchestration functions that combine actions, models, and views. The compose layer runs after all three layers are fully resolved, so it receives fully typed access with autocomplete.

```typescript
compose({ model, view, action }) {
    return {
        loadAll: async () => {
            await action.fetchUsers();
            await action.fetchTodos();
        },
        resetAll: () => {
            model.users.reset();
            model.todos.reset();
        },
    };
},
```

## When to Use Compose vs Handler

| Use `compose` when... | Use `handler` when... |
| --- | --- |
| Calling multiple actions in sequence | Running custom async logic for a single operation |
| Orchestrating actions with model mutations | Making a non-JSON HTTP request |
| Building workflows from existing actions | Returning data from the operation |
| Need access to fully typed `action` object | Need typed `payload` from call site |

> **Note:** Handlers cannot call sibling actions because the `action` object is not yet resolved when handler callbacks are defined. Compose solves this by running after `action` is fully built.

## Basic Usage

Add the optional `compose` key to `createStore`. The factory receives `{ model, view, action }` and returns a record of plain functions:

```typescript
export const store = createStore({
    name: "dashboard",
    model({ many }) {
        return {
            users: many(userShape),
            todos: many(todoShape),
        };
    },
    view({ from }) {
        return {
            users: from("users"),
            todos: from("todos"),
        };
    },
    action({ api }) {
        return {
            fetchUsers: api.get({ url: "/users" }, { model: "users", mode: ModelManyMode.SET }),
            fetchTodos: api.get({ url: "/todos" }, { model: "todos", mode: ModelManyMode.SET }),
        };
    },
    compose({ model, view, action }) {
        return {
            loadAll: async () => {
                await action.fetchUsers();
                await action.fetchTodos();
            },
        };
    },
});
```

## Compose Context

The compose factory receives a context object with three properties:

```typescript
compose({ model, view, action }) {
    // model  — StoreModel: typed access to all model mutations
    // view   — StoreView: typed access to all view computed values
    // action — StoreAction: typed access to all actions (fully resolved)
}
```

You can destructure only what you need:

```typescript
compose({ action }) {
    return {
        loadAll: async () => {
            await action.fetchUsers();
            await action.fetchTodos();
        },
    };
},
```

## Typed Arguments

Compose functions support typed arguments:

```typescript
compose({ model, action }) {
    return {
        // No arguments
        loadAll: async () => {
            await action.fetchUsers();
        },
        // Single typed argument
        selectUser: (user: User) => {
            model.current.set(user);
        },
        // Multiple typed arguments
        quickAdd: async (name: string, email: string) => {
            await action.createUser({ body: { name, email } });
        },
    };
},
```

Arguments are fully type-checked at call site:

```typescript
store.compose.selectUser(user);        // OK
store.compose.selectUser();            // Type error: expected 1 argument
store.compose.quickAdd("John");        // Type error: expected 2 arguments
store.compose.quickAdd("John", 123);   // Type error: string expected
```

## Calling Compose Functions

Compose functions are available on `store.compose`:

```typescript
// Async compose
await store.compose.loadAll();

// Sync compose
store.compose.resetAll();

// With typed arguments
store.compose.selectUser(user);
await store.compose.quickAdd("John", "john@example.com");
```

## Active State

Every compose function has a reactive `active` ref that is `true` while executing:

```typescript
store.compose.loadAll.active; // Readonly<Ref<boolean>>
```

### Template Usage

```vue
<template>
    <button @click="store.compose.loadAll()" :disabled="store.compose.loadAll.active.value">
        {{ store.compose.loadAll.active.value ? "Loading..." : "Load All" }}
    </button>
</template>
```

## Error Handling

Compose functions do not track `error` or `status` — only `active`. Errors propagate to the caller and must be handled manually with `try/catch`:

```typescript
try {
    await store.compose.loadAll();
} catch (error) {
    console.error("Failed to load:", error);
}
```

In a component:

```vue
<script setup lang="ts">
const loadAll = useStoreCompose(store, "loadAll");
const error = ref<Error | null>(null);

async function handleLoad() {
    try {
        error.value = null;
        await loadAll.execute();
    } catch (e) {
        error.value = e as Error;
    }
}
</script>

<template>
    <div v-if="error">{{ error.message }}</div>
    <button @click="handleLoad" :disabled="loadAll.active.value">Load</button>
</template>
```

> **Note:** If a compose function calls an action that throws (e.g. `ActionApiError`), the error bubbles up through compose. The `active` ref is always reset to `false` after execution, regardless of success or failure.

## Compose is Optional

The `compose` key is optional. Stores without it work exactly as before:

```typescript
const store = createStore({
    name: "users",
    model({ many }) { ... },
    view({ from }) { ... },
    action({ api }) { ... },
    // no compose — store.compose is an empty object
});
```

## Examples

### Orchestrate Multiple Actions

```typescript
compose({ action }) {
    return {
        refresh: async () => {
            await action.fetchUsers();
            await action.fetchPosts();
            await action.fetchComments();
        },
    };
},
```

### Combine Actions with Model Mutations

```typescript
compose({ model, view, action }) {
    return {
        completeAll: () => {
            for (const todo of view.todos.value) {
                if (!todo.done) {
                    model.todos.patch({ ...todo, done: true });
                }
            }
        },
    };
},
```

### Reset Multiple Models

```typescript
compose({ model }) {
    return {
        resetAll: () => {
            model.current.reset();
            model.list.reset();
            model.filters.reset();
        },
    };
},
```

## Next Steps

- [useStoreCompose](../composables/use-store-compose.md) - Composable for compose functions
- [Action](action.md) - API and handler actions
