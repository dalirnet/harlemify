import { describe, it, expect } from "vitest";
import { createStore } from "@harlem/core";

import { shape } from "../src/runtime/core/layers/shape";
import { createModelFactory } from "../src/runtime/core/layers/model";
import { createStoreState, createStoreModel } from "../src/runtime/core/utils/store";
import { ModelType, ModelManyKind, ModelOneMode } from "../src/runtime/core/types/model";
import type { ShapeInfer } from "../src/runtime/core/types/shape";

// Setup

const UserShape = shape((factory) => {
    return {
        id: factory.number(),
        name: factory.string(),
        email: factory.string(),
    };
});

type User = ShapeInfer<typeof UserShape>;

// Factory

describe("createModelFactory", () => {
    const factory = createModelFactory();

    it("one() creates object definition", () => {
        const definition = factory.one(UserShape);

        expect(definition.type).toBe(ModelType.ONE);
        expect(definition.shape).toBe(UserShape);
        expect(definition.options).toEqual({ identifier: undefined });
    });

    it("one() accepts options", () => {
        const defaultUser: User = {
            id: 1,
            name: "test",
            email: "test@test.com",
        };
        const definition = factory.one(UserShape, {
            default: defaultUser,
            identifier: "email",
        });

        expect(definition.options?.default).toEqual(defaultUser);
        expect(definition.options?.identifier).toBe("email");
    });

    it("many() creates array definition", () => {
        const definition = factory.many(UserShape);

        expect(definition.type).toBe(ModelType.MANY);
        expect(definition.shape).toBe(UserShape);
        expect(definition.options).toEqual({ identifier: undefined });
    });

    it("many() accepts options", () => {
        const definition = factory.many(UserShape, { identifier: "email" });

        expect(definition.options?.identifier).toBe("email");
    });

    it("many() accepts kind option", () => {
        const definition = factory.many(UserShape, { kind: ModelManyKind.RECORD });

        expect(definition.options?.kind).toBe("record");
    });

    it("many() defaults kind to undefined (list)", () => {
        const definition = factory.many(UserShape);

        expect(definition.options?.kind).toBeUndefined();
    });
});

// State

describe("createStoreState", () => {
    const factory = createModelFactory();

    it("returns null for one-models", () => {
        const model = {
            user: factory.one(UserShape),
        };

        const state = createStoreState(model);

        expect(state.user).toBeNull();
    });

    it("returns empty array for many-models", () => {
        const model = {
            users: factory.many(UserShape),
        };

        const state = createStoreState(model);

        expect(state.users).toEqual([]);
    });

    it("uses custom default for one-model", () => {
        const defaultUser: User = {
            id: 1,
            name: "default",
            email: "default@test.com",
        };
        const model = {
            user: factory.one(UserShape, { default: defaultUser }),
        };

        const state = createStoreState(model);

        expect(state.user).toEqual(defaultUser);
    });

    it("uses custom default for many-model", () => {
        const defaultUsers: User[] = [
            {
                id: 1,
                name: "test",
                email: "test@test.com",
            },
        ];
        const model = {
            users: factory.many(UserShape, { default: defaultUsers }),
        };

        const state = createStoreState(model);

        expect(state.users).toEqual(defaultUsers);
    });

    it("returns empty object for record many-models", () => {
        const model = {
            grouped: factory.many(UserShape, { kind: ModelManyKind.RECORD }),
        };

        const state = createStoreState(model);

        expect(state.grouped).toEqual({});
    });

    it("handles mixed model types", () => {
        const model = {
            current: factory.one(UserShape),
            list: factory.many(UserShape),
        };

        const state = createStoreState(model);

        expect(state.current).toBeNull();
        expect(state.list).toEqual([]);
    });
});

// Model

describe("createStoreModel", () => {
    const factory = createModelFactory();

    describe("one mutations", () => {
        function setup() {
            const modelDefs = {
                user: factory.one(UserShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-one-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return {
                source,
                model,
            };
        }

        it("set assigns value", () => {
            const { source, model } = setup();
            const user: User = {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            };

            model.user.set(user);

            expect(source.state.user).toEqual(user);
        });

        it("reset restores to null", () => {
            const { source, model } = setup();
            model.user.set({
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            model.user.reset();

            expect(source.state.user).toBeNull();
        });

        it("patch merges shallow by default", () => {
            const { source, model } = setup();
            model.user.set({
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            model.user.patch({ name: "Bob" });

            expect(source.state.user).toEqual({
                id: 1,
                name: "Bob",
                email: "alice@test.com",
            });
        });

        it("patch with deep option uses defu", () => {
            const NestedShape = shape((factory) => {
                return {
                    id: factory.number(),
                    config: factory.object({
                        theme: factory.string(),
                        notifications: factory.boolean(),
                    }),
                };
            });

            const modelDefs = {
                settings: factory.one(NestedShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-deep-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            model.settings.set({
                id: 1,
                config: {
                    theme: "dark",
                    notifications: true,
                },
            });
            model.settings.patch({ config: { theme: "light" } } as any, { deep: true });

            expect((source.state.settings as any).config.theme).toBe("light");
            expect((source.state.settings as any).config.notifications).toBe(true);
        });

        it("patch does nothing when value is null", () => {
            const { source, model } = setup();

            model.user.patch({ name: "Bob" });

            expect(source.state.user).toBeNull();
        });
    });

    describe("many mutations", () => {
        function setup() {
            const modelDefs = {
                users: factory.many(UserShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-many-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return {
                source,
                model,
            };
        }

        it("set assigns array", () => {
            const { source, model } = setup();
            const users: User[] = [
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
            ];

            model.users.set(users);

            expect(source.state.users).toEqual(users);
        });

        it("reset restores to empty array", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            model.users.reset();

            expect(source.state.users).toEqual([]);
        });

        it("patch updates matching items by id", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
            ]);

            model.users.patch({
                id: 1,
                name: "Alice Updated",
            } as Partial<User>);

            expect((source.state.users as User[])[0].name).toBe("Alice Updated");
            expect((source.state.users as User[])[1].name).toBe("Bob");
        });

        it("patch updates multiple items", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
            ]);

            model.users.patch([
                {
                    id: 1,
                    name: "Alice2",
                } as Partial<User>,
                {
                    id: 2,
                    name: "Bob2",
                } as Partial<User>,
            ]);

            expect((source.state.users as User[])[0].name).toBe("Alice2");
            expect((source.state.users as User[])[1].name).toBe("Bob2");
        });

        it("remove deletes matching items", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
            ]);

            model.users.remove({ id: 1 });

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].id).toBe(2);
        });

        it("remove deletes multiple items", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
                {
                    id: 3,
                    name: "Charlie",
                    email: "charlie@test.com",
                },
            ]);

            model.users.remove([{ id: 1 }, { id: 3 }]);

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].id).toBe(2);
        });

        it("remove accepts identifier-only object", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
            ]);

            model.users.remove({ id: 1 });

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].id).toBe(2);
        });

        it("remove accepts multiple identifier-only objects", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
                {
                    id: 3,
                    name: "Charlie",
                    email: "charlie@test.com",
                },
            ]);

            model.users.remove([{ id: 1 }, { id: 3 }]);

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].id).toBe(2);
        });

        it("add appends items", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            model.users.add({
                id: 2,
                name: "Bob",
                email: "bob@test.com",
            });

            expect(source.state.users).toHaveLength(2);
            expect((source.state.users as User[])[1].id).toBe(2);
        });

        it("add with prepend inserts at beginning", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            model.users.add(
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
                { prepend: true },
            );

            expect(source.state.users).toHaveLength(2);
            expect((source.state.users as User[])[0].id).toBe(2);
        });

        it("add with unique skips duplicates", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            model.users.add(
                {
                    id: 1,
                    name: "Alice Dup",
                    email: "dup@test.com",
                },
                { unique: true },
            );

            expect(source.state.users).toHaveLength(1);
        });

        it("add with unique allows new items", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            model.users.add(
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
                { unique: true },
            );

            expect(source.state.users).toHaveLength(2);
        });

        it("patch with custom by option matches by field", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
            ]);

            model.users.patch(
                {
                    email: "alice@test.com",
                    name: "Alice Updated",
                } as Partial<User>,
                { by: "email" },
            );

            expect((source.state.users as User[])[0].name).toBe("Alice Updated");
            expect((source.state.users as User[])[1].name).toBe("Bob");
        });

        it("remove matches by any field", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
            ]);

            model.users.remove({ email: "alice@test.com" });

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].name).toBe("Bob");
        });

        it("remove matches by multiple fields", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
                {
                    id: 2,
                    name: "Alice",
                    email: "bob@test.com",
                },
            ]);

            model.users.remove({ name: "Alice", email: "alice@test.com" });

            expect(source.state.users).toHaveLength(1);
            expect((source.state.users as User[])[0].email).toBe("bob@test.com");
        });

        it("add with unique and custom by option", () => {
            const { source, model } = setup();
            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ]);

            model.users.add(
                {
                    id: 2,
                    name: "Alice Dup",
                    email: "alice@test.com",
                },
                {
                    unique: true,
                    by: "email",
                },
            );

            expect(source.state.users).toHaveLength(1);
        });

        it("patch with deep option uses defu", () => {
            const NestedItemShape = shape((factory) => {
                return {
                    id: factory.number(),
                    config: factory.object({
                        theme: factory.string(),
                        notifications: factory.boolean(),
                    }),
                };
            });

            const modelDefs = {
                items: factory.many(NestedItemShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-many-deep-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            model.items.set([
                {
                    id: 1,
                    config: {
                        theme: "dark",
                        notifications: true,
                    },
                },
            ]);

            model.items.patch({ id: 1, config: { theme: "light" } } as any, { deep: true });

            expect((source.state.items as any[])[0].config.theme).toBe("light");
            expect((source.state.items as any[])[0].config.notifications).toBe(true);
        });

        it("uses custom identifier option", () => {
            const modelDefs = {
                users: factory.many(UserShape, { identifier: "email" }),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-custom-id-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            model.users.set([
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
                {
                    id: 2,
                    name: "Bob",
                    email: "bob@test.com",
                },
            ]);

            model.users.patch({
                email: "alice@test.com",
                name: "Alice Updated",
            } as Partial<User>);

            expect((source.state.users as User[])[0].name).toBe("Alice Updated");
            expect((source.state.users as User[])[1].name).toBe("Bob");
        });
    });

    describe("many mutations without identifier", () => {
        const NoIdShape = shape((factory) => {
            return {
                name: factory.string(),
                email: factory.string(),
            };
        });

        type NoIdItem = ShapeInfer<typeof NoIdShape>;

        function setup() {
            const modelDefs = {
                items: factory.many(NoIdShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-no-id-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return {
                source,
                model,
            };
        }

        it("set and reset work without identifier", () => {
            const { source, model } = setup();
            const items: NoIdItem[] = [
                { name: "Alice", email: "alice@test.com" },
                { name: "Bob", email: "bob@test.com" },
            ];

            model.items.set(items);
            expect(source.state.items).toEqual(items);

            model.items.reset();
            expect(source.state.items).toEqual([]);
        });

        it("add works without identifier", () => {
            const { source, model } = setup();
            model.items.set([{ name: "Alice", email: "alice@test.com" }]);

            model.items.add({ name: "Bob", email: "bob@test.com" });

            expect(source.state.items).toHaveLength(2);
        });

        it("patch matches by custom by option without identifier", () => {
            const { source, model } = setup();
            model.items.set([
                { name: "Alice", email: "alice@test.com" },
                { name: "Bob", email: "bob@test.com" },
            ]);

            model.items.patch({ email: "alice@test.com", name: "Alice Updated" } as Partial<NoIdItem>, {
                by: "email",
            });

            expect((source.state.items as NoIdItem[])[0].name).toBe("Alice Updated");
            expect((source.state.items as NoIdItem[])[1].name).toBe("Bob");
        });

        it("remove matches by field without identifier", () => {
            const { source, model } = setup();
            model.items.set([
                { name: "Alice", email: "alice@test.com" },
                { name: "Bob", email: "bob@test.com" },
            ]);

            model.items.remove({ email: "alice@test.com" });

            expect(source.state.items).toHaveLength(1);
            expect((source.state.items as NoIdItem[])[0].name).toBe("Bob");
        });

        it("add with unique uses custom by option without identifier", () => {
            const { source, model } = setup();
            model.items.set([{ name: "Alice", email: "alice@test.com" }]);

            model.items.add({ name: "Alice Dup", email: "alice@test.com" }, { unique: true, by: "email" });

            expect(source.state.items).toHaveLength(1);
        });
    });

    describe("commit method", () => {
        it("commits value to state", () => {
            const modelDefs = {
                user: factory.one(UserShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-commit-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            const user: User = {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            };
            model.user.commit(ModelOneMode.SET, user);

            expect(source.state.user).toEqual(user);
        });

        it("handles reset mode", () => {
            const modelDefs = {
                user: factory.one(UserShape),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-commit-reset-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            model.user.commit(ModelOneMode.SET, {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });
            model.user.commit(ModelOneMode.RESET);

            expect(source.state.user).toBeNull();
        });
    });

    describe("record mutations", () => {
        function setup() {
            const modelDefs = {
                grouped: factory.many(UserShape, { kind: ModelManyKind.RECORD }),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-record-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            return {
                source,
                model,
            };
        }

        it("initializes with empty object", () => {
            const { source } = setup();

            expect(source.state.grouped).toEqual({});
        });

        it("set replaces entire record", () => {
            const { source, model } = setup();
            const grouped: Record<string, User[]> = {
                "team-a": [
                    { id: 1, name: "Alice", email: "alice@test.com" },
                    { id: 2, name: "Bob", email: "bob@test.com" },
                ],
            };

            model.grouped.set(grouped);

            expect(source.state.grouped).toEqual(grouped);
        });

        it("set replaces with multiple keys", () => {
            const { source, model } = setup();
            const grouped: Record<string, User[]> = {
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
                "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            };

            model.grouped.set(grouped);

            expect(Object.keys(source.state.grouped as Record<string, User[]>)).toHaveLength(2);
            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-b"]).toHaveLength(1);
        });

        it("set overwrites previous record", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
                "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            });

            model.grouped.set({
                "team-c": [{ id: 3, name: "Charlie", email: "charlie@test.com" }],
            });

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toBeUndefined();
            expect((source.state.grouped as Record<string, User[]>)["team-b"]).toBeUndefined();
            expect((source.state.grouped as Record<string, User[]>)["team-c"]).toHaveLength(1);
        });

        it("reset clears entire record", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
                "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            });

            model.grouped.reset();

            expect(source.state.grouped).toEqual({});
        });

        it("patch merges keys into record", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
            });

            model.grouped.patch({
                "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            });

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-b"]).toHaveLength(1);
        });

        it("patch overwrites existing key", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
            });

            model.grouped.patch({
                "team-a": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            });

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-a"][0].name).toBe("Bob");
        });

        it("remove deletes key from record", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
                "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            });

            model.grouped.remove("team-a");

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toBeUndefined();
            expect((source.state.grouped as Record<string, User[]>)["team-b"]).toHaveLength(1);
        });

        it("remove does nothing for missing key", () => {
            const { source, model } = setup();

            model.grouped.remove("missing");

            expect(source.state.grouped).toEqual({});
        });

        it("add adds key to record", () => {
            const { source, model } = setup();

            model.grouped.add("team-a", [{ id: 1, name: "Alice", email: "alice@test.com" }]);

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
        });

        it("add preserves existing keys", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
            });

            model.grouped.add("team-b", [{ id: 2, name: "Bob", email: "bob@test.com" }]);

            expect(Object.keys(source.state.grouped as Record<string, User[]>)).toHaveLength(2);
        });

        it("patch with deep option uses defu", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
            });

            model.grouped.patch(
                {
                    "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
                },
                { deep: true },
            );

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-a"][0].name).toBe("Alice");
            expect((source.state.grouped as Record<string, User[]>)["team-b"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-b"][0].name).toBe("Bob");
        });

        it("add overwrites existing key", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
            });

            model.grouped.add("team-a", [{ id: 2, name: "Bob", email: "bob@test.com" }]);

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-a"][0].name).toBe("Bob");
        });

        it("remove last key leaves empty object", () => {
            const { source, model } = setup();
            model.grouped.set({
                "team-a": [{ id: 1, name: "Alice", email: "alice@test.com" }],
            });

            model.grouped.remove("team-a");

            expect(source.state.grouped).toEqual({});
        });

        it("reset restores custom default", () => {
            const modelDefs = {
                grouped: factory.many(UserShape, {
                    kind: ModelManyKind.RECORD,
                    default: {
                        "team-a": [{ id: 1, name: "Default", email: "default@test.com" }],
                    },
                }),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);
            const source = createStore("test-record-default-" + Math.random(), state);
            const model = createStoreModel(modelDefs, source);

            model.grouped.set({
                "team-b": [{ id: 2, name: "Bob", email: "bob@test.com" }],
            });

            model.grouped.reset();

            expect((source.state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((source.state.grouped as Record<string, User[]>)["team-a"][0].name).toBe("Default");
        });

        it("uses custom default", () => {
            const modelDefs = {
                grouped: factory.many(UserShape, {
                    kind: ModelManyKind.RECORD,
                    default: {
                        "team-a": [{ id: 1, name: "Default", email: "default@test.com" }],
                    },
                }),
            };

            for (const [k, def] of Object.entries(modelDefs)) {
                def.key = k;
            }

            const state = createStoreState(modelDefs);

            expect((state.grouped as Record<string, User[]>)["team-a"]).toHaveLength(1);
            expect((state.grouped as Record<string, User[]>)["team-a"][0].name).toBe("Default");
        });
    });
});
