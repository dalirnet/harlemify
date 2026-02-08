import { describe, it, expect } from "vitest";
import { createStore } from "@harlem/core";

import { shape } from "../src/runtime/core/layers/shape";
import { createModelFactory } from "../src/runtime/core/layers/model";
import { createViewFactory } from "../src/runtime/core/layers/view";
import { createStoreState, createStoreModel } from "../src/runtime/core/utils/store";
import { createView } from "../src/runtime/core/utils/view";
import type { ShapeInfer } from "../src/runtime/core/types/shape";

const UserShape = shape((factory) => {
    return {
        id: factory.number(),
        name: factory.string(),
        email: factory.string(),
    };
});

type User = ShapeInfer<typeof UserShape>;

describe("createViewFactory", () => {
    const viewFactory = createViewFactory();

    it("from() creates single-source definition", () => {
        const definition = viewFactory.from("user");

        expect(definition.model).toEqual(["user"]);
        expect(definition.resolver).toBeUndefined();
    });

    it("from() with resolver", () => {
        const resolver = (user: User | null) => {
            return user?.name ?? "unknown";
        };

        const definition = viewFactory.from("user", resolver);

        expect(definition.model).toEqual(["user"]);
        expect(definition.resolver).toBe(resolver);
    });

    it("merge() creates multi-source definition", () => {
        const resolver = (user: User | null, users: User[]) => {
            return {
                current: user,
                total: users?.length ?? 0,
            };
        };

        const definition = viewFactory.merge(["user", "users"], resolver);

        expect(definition.models).toEqual(["user", "users"]);
        expect(definition.resolver).toBe(resolver);
    });
});

describe("createView", () => {
    function setup() {
        const modelFactory = createModelFactory();
        const modelDefs = {
            user: modelFactory.one(UserShape),
            users: modelFactory.many(UserShape),
        };

        const viewFactory = createViewFactory();

        for (const [k, def] of Object.entries(modelDefs)) {
            def.setKey(k);
        }

        const state = createStoreState(modelDefs);
        const source = createStore("test-view-" + Math.random(), state);
        const model = createStoreModel(modelDefs, source);

        return {
            source,
            model,
            viewFactory,
        };
    }

    it("creates view from single source", () => {
        const { source, viewFactory } = setup();

        const definition = viewFactory.from("user");
        definition.setKey("user");
        const user = createView(definition, source);

        expect(user).toBeDefined();
        expect(user.value).toBeNull();
    });

    it("view reflects state changes", () => {
        const { source, model, viewFactory } = setup();

        const definition = viewFactory.from("user");
        definition.setKey("user");
        const user = createView(definition, source);
        const userData: User = {
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        };

        model.user.set(userData);

        expect(user.value).toEqual(userData);
    });

    it("view with resolver transforms data", () => {
        const { source, model, viewFactory } = setup();

        const definition = viewFactory.from("user", (user: User | null) => {
            return user?.name ?? "unknown";
        });
        definition.setKey("userName");
        const userName = createView(definition, source);

        expect(userName.value).toBe("unknown");

        model.user.set({
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        });

        expect(userName.value).toBe("Alice");
    });

    it("merge view combines multiple sources", () => {
        const { source, model, viewFactory } = setup();

        const definition = viewFactory.merge(["user", "users"], (user: User | null, users: User[]) => {
            return {
                current: user?.name ?? "none",
                total: users?.length ?? 0,
            };
        });
        definition.setKey("summary");
        const summary = createView(definition, source);

        expect(summary.value).toEqual({
            current: "none",
            total: 0,
        });

        model.user.set({
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        });
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

        expect(summary.value).toEqual({
            current: "Alice",
            total: 2,
        });
    });
});
