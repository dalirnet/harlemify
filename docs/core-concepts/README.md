# Core Concepts

Harlemify stores are built from four layers, each defined by a factory function inside `createStore`.

```
Shape (Zod)
└── createStore({ name, model, view, action, compose? })
    ├── Model   → State
    │   ├── one()
    │   └── many()
    ├── View    → Computed
    │   ├── from()
    │   └── merge()
    ├── Action  → Async
    │   ├── api()
    │   └── handler()
    └── Compose → Orchestration (optional)
```

## Concepts

Every store splits into layers with a clear responsibility:

- **Shape** — Data schema defined with Zod. Types everything in the store.
- **Model** — Mutable state. Changed only through typed commits.
- **View** — Read-only computed data derived from models.
- **Action** — Async operations. Fetches data and commits it to models.
- **Compose** — Orchestration functions that combine actions, models, and views.

Data flows one way: **Action → Model → View**. Compose sits on top, orchestrating all three.

## [Shape](shape.md)

Define data structures with Zod via the `shape` helper. Mark identifiers with `.meta()` for automatic array matching.

```typescript
const userShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    name: factory.string(),
    email: factory.email(),
}));
```

## [Model](model.md)

State containers using `one(shape)` for single items and `many(shape)` for collections. Each model key exposes typed mutation methods (`set`, `patch`, `reset`, `add`, `remove`).

```typescript
model({ one, many }) {
    return {
        current: one(userShape),   // User | null
        list: many(userShape),     // User[]
    };
},
```

## [View](view.md)

Reactive `ComputedRef` properties derived from model state. Use `from` for single-source views and `merge` to combine multiple models.

```typescript
view({ from, merge }) {
    return {
        user: from("current"),
        count: from("list", (model) => model.length),
        summary: merge(["current", "list"], (current, list) => ({
            selected: current?.name ?? null,
            total: list.length,
        })),
    };
},
```

## [Action](action.md)

Async operations with two entry points. `api` makes HTTP requests with optional auto-commit to a model. `handler` runs custom logic with direct model and view access.

```typescript
action({ api, handler }) {
    return {
        list: api.get({ url: "/users" }, { model: "list", mode: ModelManyMode.SET }),
        sort: handler(async ({ model, view }) => {
            const sorted = [...view.users.value].sort((a, b) => a.name.localeCompare(b.name));
            model.list.set(sorted);
        }),
    };
},
```

Every action tracks `loading`, `status`, `error`, and `data` automatically.

## [Compose](compose.md)

Optional orchestration layer. Compose functions receive fully typed `{ model, view, action }` and can call sibling actions, mutate models, and read views. Each compose function tracks an `active` ref while executing.

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
