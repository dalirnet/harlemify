import { z } from "zod";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { createStore } from "../src/runtime/core/store";
import { Endpoint, EndpointStatus } from "../src/runtime/utils/endpoint";
import { Memory } from "../src/runtime/utils/memory";

vi.stubGlobal("useRuntimeConfig", () => ({
    public: { harlemify: { api: { url: "https://api.example.com" } } },
}));

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

const UserSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({
        actions: ["create", "replace", "update"],
    }),
    email: z.string().meta({ actions: ["create"] }),
    createdAt: z.string(),
});

type User = z.infer<typeof UserSchema>;

const actions = {
    get: {
        endpoint: Endpoint.get<User>((p) => `/users/${p.id}`),
        memory: Memory.unit(),
    },
    list: {
        endpoint: Endpoint.get("/users"),
        memory: Memory.units(),
    },
    create: {
        endpoint: Endpoint.post("/users"),
        memory: Memory.units().add(),
    },
    update: {
        endpoint: Endpoint.patch<User>((p) => `/users/${p.id}`),
        memory: Memory.units().edit(),
    },
    delete: {
        endpoint: Endpoint.delete<User>((p) => `/users/${p.id}`),
        memory: Memory.units().drop(),
    },
    replace: {
        endpoint: Endpoint.put<User>((p) => `/users/${p.id}`),
        memory: Memory.unit(),
    },
    export: {
        endpoint: Endpoint.get("/users/export"),
        // No memory - just returns data
    },
};

describe("createStore", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates store with initial state and monitor", () => {
        const userStore = createStore("user1", UserSchema, actions);

        expect(userStore.unit.value).toBeNull();
        expect(userStore.units.value).toEqual([]);
        expect(userStore.monitor.list).toBeDefined();
        expect(userStore.monitor.list.idle()).toBe(true);
    });

    describe("memory", () => {
        it("sets and clears unit via memory API", () => {
            const userStore = createStore("user2", UserSchema, actions);
            const user: User = {
                id: 1,
                name: "John",
                email: "john@example.com",
                createdAt: "2024-01-01",
            };

            userStore.memory.set(user);
            expect(userStore.unit.value).toEqual(user);

            userStore.memory.set(null);
            expect(userStore.unit.value).toBeNull();
        });

        it("sets and clears units via memory API", () => {
            const userStore = createStore("user3", UserSchema, actions);
            const users: User[] = [
                { id: 1, name: "John", email: "john@example.com", createdAt: "2024-01-01" },
                { id: 2, name: "Jane", email: "jane@example.com", createdAt: "2024-01-02" },
            ];

            userStore.memory.set(users);
            expect(userStore.units.value).toEqual(users);

            userStore.memory.set([]);
            expect(userStore.units.value).toEqual([]);
        });

        it("edits unit by indicator via memory API", () => {
            const userStore = createStore("user4", UserSchema, actions);
            userStore.memory.set({
                id: 1,
                name: "John",
                email: "john@example.com",
                createdAt: "2024-01-01",
            });

            userStore.memory.edit({ id: 1, name: "John Doe" });
            expect(userStore.unit.value?.name).toBe("John Doe");
        });

        it("edits units by indicator via memory API", () => {
            const userStore = createStore("user5", UserSchema, actions);
            userStore.memory.set([
                { id: 1, name: "John", email: "john@example.com", createdAt: "2024-01-01" },
                { id: 2, name: "Jane", email: "jane@example.com", createdAt: "2024-01-02" },
            ]);

            userStore.memory.edit([
                { id: 1, name: "John Doe" },
                { id: 2, name: "Jane Doe" },
            ]);

            expect(userStore.units.value[0].name).toBe("John Doe");
            expect(userStore.units.value[1].name).toBe("Jane Doe");
        });

        it("drops unit by indicator via memory API", () => {
            const userStore = createStore("user6", UserSchema, actions);
            userStore.memory.set({
                id: 1,
                name: "John",
                email: "john@example.com",
                createdAt: "2024-01-01",
            });

            userStore.memory.drop({ id: 1 });
            expect(userStore.unit.value).toBeNull();
        });

        it("drops units by indicator via memory API", () => {
            const userStore = createStore("user7", UserSchema, actions);
            userStore.memory.set([
                { id: 1, name: "John", email: "john@example.com", createdAt: "2024-01-01" },
                { id: 2, name: "Jane", email: "jane@example.com", createdAt: "2024-01-02" },
                { id: 3, name: "Bob", email: "bob@example.com", createdAt: "2024-01-03" },
            ]);

            userStore.memory.drop([{ id: 1 }, { id: 3 }]);

            expect(userStore.units.value).toHaveLength(1);
            expect(userStore.units.value[0].id).toBe(2);
        });
    });

    describe("custom indicator", () => {
        it("uses custom indicator from options", () => {
            const CustomSchema = z.object({
                uuid: z.string(),
                name: z.string(),
            });
            const customActions = {
                list: {
                    endpoint: Endpoint.get("/items"),
                    memory: Memory.units(),
                },
            };
            const customStore = createStore("custom", CustomSchema, customActions, { indicator: "uuid" });

            customStore.memory.set([{ uuid: "abc-123", name: "Item 1" }]);

            expect(customStore.units.value[0].uuid).toBe("abc-123");
        });
    });

    describe("lifecycle hooks", () => {
        it("calls before and after hooks on success", async () => {
            const beforeHook = vi.fn();
            const afterHook = vi.fn();
            mockFetch.mockResolvedValueOnce([]);

            const userStore = createStore("user10", UserSchema, actions, {
                hooks: { before: beforeHook, after: afterHook },
            });

            await userStore.action.list();

            expect(beforeHook).toHaveBeenCalledTimes(1);
            expect(afterHook).toHaveBeenCalledWith();
        });

        it("calls after hook with error on failure", async () => {
            const afterHook = vi.fn();
            const error = new Error("API Error");
            mockFetch.mockRejectedValueOnce(error);

            const userStore = createStore("user11", UserSchema, actions, {
                hooks: { after: afterHook },
            });

            await expect(userStore.action.list()).rejects.toThrow("API Error");
            expect(afterHook).toHaveBeenCalledWith(error);
        });
    });

    describe("action", () => {
        it("get fetches and stores single unit", async () => {
            const user = {
                id: 1,
                name: "John",
                email: "john@example.com",
                createdAt: "2024-01-01",
            };
            mockFetch.mockResolvedValueOnce(user);

            const userStore = createStore("user12", UserSchema, actions);
            const result = await userStore.action.get({ id: 1 });

            expect(result).toEqual(user);
            expect(userStore.unit.value).toEqual(user);
        });

        it("list fetches and stores multiple units", async () => {
            const users = [
                { id: 1, name: "John", email: "john@example.com" },
                { id: 2, name: "Jane", email: "jane@example.com" },
            ];
            mockFetch.mockResolvedValueOnce(users);

            const userStore = createStore("user13", UserSchema, actions);
            const result = await userStore.action.list();

            expect(result).toEqual(users);
            expect(userStore.units.value).toEqual(users);
        });

        it("create adds to units at end by default", async () => {
            mockFetch.mockResolvedValueOnce({ id: 10 });

            const userStore = createStore("user14", UserSchema, actions);
            userStore.memory.set([{ id: 1, name: "Existing", email: "e@e.com", createdAt: "" }]);

            await userStore.action.create({ id: 0, name: "New", email: "n@n.com", createdAt: "" });

            expect(userStore.units.value).toHaveLength(2);
            expect(userStore.units.value[1].id).toBe(10);
        });

        it("create with add({ prepend: true }) prepends to units", async () => {
            mockFetch.mockResolvedValueOnce({ id: 10 });

            const actionsWithFirst = {
                create: {
                    endpoint: Endpoint.post("/users"),
                    memory: Memory.units().add({ prepend: true }),
                },
            };
            const userStore = createStore("user15", UserSchema, actionsWithFirst);
            userStore.memory.set([{ id: 1, name: "Existing", email: "e@e.com", createdAt: "" }]);

            await userStore.action.create({ id: 0, name: "New", email: "n@n.com", createdAt: "" });

            expect(userStore.units.value[0].id).toBe(10);
        });

        it("update partially updates existing unit in units", async () => {
            mockFetch.mockResolvedValueOnce({ id: 1, name: "Updated" });

            const userStore = createStore("user16", UserSchema, actions);
            userStore.memory.set([{ id: 1, name: "Original", email: "test@e.com", createdAt: "" }]);

            await userStore.action.update({ id: 1, name: "Updated" });

            expect(userStore.units.value[0].name).toBe("Updated");
            expect(userStore.units.value[0].email).toBe("test@e.com");
        });

        it("delete removes unit from units", async () => {
            mockFetch.mockResolvedValueOnce({});

            const userStore = createStore("user17", UserSchema, actions);
            userStore.memory.set([
                { id: 1, name: "John", email: "j@e.com", createdAt: "" },
                { id: 2, name: "Jane", email: "ja@e.com", createdAt: "" },
            ]);

            await userStore.action.delete({ id: 1 });

            expect(userStore.units.value).toHaveLength(1);
            expect(userStore.units.value[0].id).toBe(2);
        });

        it("replace replaces unit entirely", async () => {
            mockFetch.mockResolvedValueOnce({
                id: 1,
                name: "Replaced",
                email: "replaced@e.com",
                createdAt: "2024-01-01",
            });

            const userStore = createStore("user23", UserSchema, actions);
            userStore.memory.set({
                id: 1,
                name: "Original",
                email: "original@e.com",
                createdAt: "",
            });

            const result = await userStore.action.replace({
                id: 1,
                name: "Replaced",
                email: "replaced@e.com",
                createdAt: "2024-01-01",
            });

            expect((result as User).name).toBe("Replaced");
            expect(userStore.unit.value?.name).toBe("Replaced");
        });

        it("action without memory just returns data", async () => {
            const exportData = { users: [{ id: 1, name: "John" }] };
            mockFetch.mockResolvedValueOnce(exportData);

            const userStore = createStore("user24", UserSchema, actions);
            const result = await userStore.action.export();

            expect(result).toEqual(exportData);
            // Memory should not be affected
            expect(userStore.unit.value).toBeNull();
            expect(userStore.units.value).toEqual([]);
        });

        it("update with Memory.unit().edit() updates existing singleton", async () => {
            // Simulates config store pattern: get() then update() on a singleton
            const ConfigSchema = z.object({
                id: z.number().meta({ indicator: true }),
                theme: z.enum(["light", "dark"]).meta({ actions: ["update"] }),
                language: z.string().meta({ actions: ["update"] }),
            });

            const configActions = {
                get: {
                    endpoint: Endpoint.get("/config"),
                    memory: Memory.unit(),
                },
                update: {
                    endpoint: Endpoint.patch("/config"),
                    memory: Memory.unit().edit(),
                },
            };

            const configStore = createStore("config34", ConfigSchema, configActions);

            // First, get the config (simulates initial load)
            mockFetch.mockResolvedValueOnce({ id: 1, theme: "dark", language: "en" });
            await configStore.action.get();
            expect(configStore.unit.value).toEqual({ id: 1, theme: "dark", language: "en" });

            // Then update the theme
            mockFetch.mockResolvedValueOnce({ id: 1, theme: "light", language: "en" });
            await configStore.action.update({ id: 1, theme: "light" });

            // Verify the unit was updated
            expect(configStore.unit.value?.theme).toBe("light");
            expect(configStore.unit.value?.language).toBe("en");
        });
    });

    describe("validation", () => {
        it("validates create with validate option", async () => {
            const userStore = createStore("user26", UserSchema, actions);

            await expect(
                userStore.action.create(
                    { id: 0, name: 123 as any, email: "test@e.com", createdAt: "" },
                    { validate: true },
                ),
            ).rejects.toThrow();
        });

        it("validates update with validate option", async () => {
            const userStore = createStore("user28", UserSchema, actions);

            await expect(userStore.action.update({ id: 1, name: 123 as any }, { validate: true })).rejects.toThrow();
        });

        it("skips validation when validate is false or not set", async () => {
            mockFetch.mockResolvedValueOnce({ id: 1 });

            const userStore = createStore("user29", UserSchema, actions);

            await expect(
                userStore.action.create({ id: 0, name: "Valid", email: "test@e.com", createdAt: "" }),
            ).resolves.toBeDefined();
        });
    });

    describe("monitor", () => {
        it("has monitor for each action", () => {
            const userStore = createStore("user19", UserSchema, actions);

            expect(userStore.monitor.get).toBeDefined();
            expect(userStore.monitor.list).toBeDefined();
            expect(userStore.monitor.create).toBeDefined();
            expect(userStore.monitor.update).toBeDefined();
            expect(userStore.monitor.delete).toBeDefined();
            expect(userStore.monitor.replace).toBeDefined();
            expect(userStore.monitor.export).toBeDefined();
        });

        it("monitor has all status properties", () => {
            const userStore = createStore("user20", UserSchema, actions);

            expect(userStore.monitor.list.current()).toBe(EndpointStatus.IDLE);
            expect(userStore.monitor.list.idle()).toBe(true);
            expect(userStore.monitor.list.pending()).toBe(false);
            expect(userStore.monitor.list.success()).toBe(false);
            expect(userStore.monitor.list.failed()).toBe(false);
        });

        it("transitions to SUCCESS on success", async () => {
            mockFetch.mockResolvedValueOnce([]);
            const userStore = createStore("user21", UserSchema, actions);

            await userStore.action.list();

            expect(userStore.monitor.list.success()).toBe(true);
            expect(userStore.monitor.list.current()).toBe(EndpointStatus.SUCCESS);
        });

        it("transitions to FAILED on error", async () => {
            mockFetch.mockRejectedValueOnce(new Error("API Error"));
            const userStore = createStore("user30", UserSchema, actions);

            await expect(userStore.action.list()).rejects.toThrow();

            expect(userStore.monitor.list.failed()).toBe(true);
            expect(userStore.monitor.list.current()).toBe(EndpointStatus.FAILED);
        });

        it("throws if action called while pending", async () => {
            let resolveFirst: () => void;
            const pendingPromise = new Promise<void>((resolve) => {
                resolveFirst = resolve;
            });

            mockFetch.mockImplementation(() => pendingPromise);

            const userStore = createStore("user31", UserSchema, actions);

            const firstCall = userStore.action.list();

            // Wait a tick for the status to update
            await new Promise((resolve) => setTimeout(resolve, 0));

            await expect(userStore.action.list()).rejects.toThrow('Action "list" is already pending');

            resolveFirst!();
            await firstCall;
        });
    });

    describe("adapter priority", () => {
        it("uses endpoint adapter when provided", async () => {
            const endpointAdapter = vi.fn().mockResolvedValue({ data: { id: 1 } });
            const storeAdapter = vi.fn().mockResolvedValue({ data: { id: 2 } });

            const actionsWithAdapter = {
                get: {
                    endpoint: Endpoint.get<User>((p) => `/users/${p.id}`).withAdapter(endpointAdapter),
                    memory: Memory.unit(),
                },
            };

            const userStore = createStore("user32", UserSchema, actionsWithAdapter, {
                adapter: storeAdapter,
            });

            await userStore.action.get({ id: 1 });

            expect(endpointAdapter).toHaveBeenCalled();
            expect(storeAdapter).not.toHaveBeenCalled();
        });

        it("uses call-time adapter over endpoint adapter", async () => {
            const endpointAdapter = vi.fn().mockResolvedValue({ data: { id: 1 } });
            const callTimeAdapter = vi.fn().mockResolvedValue({ data: { id: 3 } });

            const actionsWithAdapter = {
                get: {
                    endpoint: Endpoint.get<User>((p) => `/users/${p.id}`).withAdapter(endpointAdapter),
                    memory: Memory.unit(),
                },
            };

            const userStore = createStore("user33", UserSchema, actionsWithAdapter);

            await userStore.action.get({ id: 1 }, { adapter: callTimeAdapter });

            expect(callTimeAdapter).toHaveBeenCalled();
            expect(endpointAdapter).not.toHaveBeenCalled();
        });

        it("uses store adapter when no endpoint adapter", async () => {
            const storeAdapter = vi.fn().mockResolvedValue({ data: { id: 1 } });

            const simpleActions = {
                get: {
                    endpoint: Endpoint.get<User>((p) => `/users/${p.id}`),
                    memory: Memory.unit(),
                },
            };

            const userStore = createStore("user35", UserSchema, simpleActions, {
                adapter: storeAdapter,
            });

            await userStore.action.get({ id: 1 });

            expect(storeAdapter).toHaveBeenCalled();
        });
    });

    describe("nested memory operations", () => {
        const ProjectSchema = z.object({
            id: z.number().meta({ indicator: true }),
            name: z.string().meta({ actions: ["create", "update"] }),
            milestones: z.array(
                z.object({
                    id: z.number(),
                    name: z.string(),
                    done: z.boolean(),
                }),
            ),
            meta: z.object({
                deadline: z.string(),
                budget: z.number(),
                options: z.object({
                    notify: z.boolean(),
                    priority: z.number(),
                }),
            }),
        });

        type Project = z.infer<typeof ProjectSchema>;

        it("sets nested field with Memory.unit('field')", async () => {
            const projectActions = {
                get: {
                    endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}`),
                    memory: Memory.unit(),
                },
                milestones: {
                    endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}/milestones`),
                    memory: Memory.unit("milestones"),
                },
            };

            const projectStore = createStore("project40", ProjectSchema, projectActions);

            // First set the unit
            projectStore.memory.set({
                id: 1,
                name: "Project 1",
                milestones: [],
                meta: { deadline: "", budget: 0, options: { notify: false, priority: 0 } },
            });

            // Then fetch milestones which should update nested path
            mockFetch.mockResolvedValueOnce([
                { id: 1, name: "Milestone 1", done: false },
                { id: 2, name: "Milestone 2", done: true },
            ]);

            await projectStore.action.milestones({ id: 1 });

            expect(projectStore.unit.value?.milestones).toHaveLength(2);
            expect(projectStore.unit.value?.milestones[0].name).toBe("Milestone 1");
        });

        it("sets two-level nested field with Memory.unit('field', 'nested')", async () => {
            const projectActions = {
                get: {
                    endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}`),
                    memory: Memory.unit(),
                },
                options: {
                    endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}/options`),
                    memory: Memory.unit("meta", "options"),
                },
            };

            const projectStore = createStore("project41", ProjectSchema, projectActions);

            // First set the unit
            projectStore.memory.set({
                id: 1,
                name: "Project 1",
                milestones: [],
                meta: { deadline: "2024-12-31", budget: 10000, options: { notify: false, priority: 0 } },
            });

            // Then fetch options which should update nested path
            mockFetch.mockResolvedValueOnce({ notify: true, priority: 5 });

            await projectStore.action.options({ id: 1 });

            expect(projectStore.unit.value?.meta.options.notify).toBe(true);
            expect(projectStore.unit.value?.meta.options.priority).toBe(5);
            // Other meta fields should be preserved
            expect(projectStore.unit.value?.meta.deadline).toBe("2024-12-31");
            expect(projectStore.unit.value?.meta.budget).toBe(10000);
        });

        it("edits nested field with Memory.unit('field').edit()", async () => {
            const projectActions = {
                get: {
                    endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}`),
                    memory: Memory.unit(),
                },
                meta: {
                    endpoint: Endpoint.patch<Project>((p) => `/projects/${p.id}/meta`),
                    memory: Memory.unit("meta").edit(),
                },
            };

            const projectStore = createStore("project42", ProjectSchema, projectActions);

            // First set the unit
            projectStore.memory.set({
                id: 1,
                name: "Project 1",
                milestones: [],
                meta: { deadline: "2024-12-31", budget: 10000, options: { notify: false, priority: 0 } },
            });

            // Then update meta which should merge
            mockFetch.mockResolvedValueOnce({ deadline: "2025-06-30" });

            await projectStore.action.meta({ id: 1 });

            expect(projectStore.unit.value?.meta.deadline).toBe("2025-06-30");
            // Other meta fields should be preserved via merge
            expect(projectStore.unit.value?.meta.budget).toBe(10000);
        });

        it("drops nested field with Memory.unit('field').drop()", async () => {
            const projectActions = {
                get: {
                    endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}`),
                    memory: Memory.unit(),
                },
                clearMilestones: {
                    endpoint: Endpoint.delete<Project>((p) => `/projects/${p.id}/milestones`),
                    memory: Memory.unit("milestones").drop(),
                },
            };

            const projectStore = createStore("project43", ProjectSchema, projectActions);

            // First set the unit with milestones
            projectStore.memory.set({
                id: 1,
                name: "Project 1",
                milestones: [{ id: 1, name: "M1", done: false }],
                meta: { deadline: "", budget: 0, options: { notify: false, priority: 0 } },
            });

            // Then clear milestones
            mockFetch.mockResolvedValueOnce({});

            await projectStore.action.clearMilestones({ id: 1 });

            expect(projectStore.unit.value?.milestones).toBeNull();
            // Other fields should be preserved
            expect(projectStore.unit.value?.name).toBe("Project 1");
        });

        it("does nothing if unit is null when setting nested path", async () => {
            const projectActions = {
                milestones: {
                    endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}/milestones`),
                    memory: Memory.unit("milestones"),
                },
            };

            const projectStore = createStore("project44", ProjectSchema, projectActions);

            // Unit is null, should not throw
            mockFetch.mockResolvedValueOnce([{ id: 1, name: "Milestone", done: false }]);

            await projectStore.action.milestones({ id: 1 });

            expect(projectStore.unit.value).toBeNull();
        });
    });

    describe("action options", () => {
        it("passes query parameters to request", async () => {
            mockFetch.mockResolvedValueOnce([]);

            const userStore = createStore("user50", UserSchema, actions);

            await userStore.action.list({}, { query: { page: 1, limit: 10 } });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    query: expect.objectContaining({ page: 1, limit: 10 }),
                }),
            );
        });

        it("passes headers to request", async () => {
            mockFetch.mockResolvedValueOnce([]);

            const userStore = createStore("user51", UserSchema, actions);

            await userStore.action.list({}, { headers: { "X-Custom": "value" } });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    headers: expect.objectContaining({ "X-Custom": "value" }),
                }),
            );
        });

        it("overrides body with options.body", async () => {
            mockFetch.mockResolvedValueOnce({ id: 1 });

            const userStore = createStore("user52", UserSchema, actions);

            await userStore.action.create(
                { id: 0, name: "John", email: "john@test.com", createdAt: "" },
                { body: { customField: "value" } },
            );

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    body: { customField: "value" },
                }),
            );
        });

        it("passes signal for abort controller", async () => {
            const controller = new AbortController();
            mockFetch.mockResolvedValueOnce([]);

            const userStore = createStore("user53", UserSchema, actions);

            await userStore.action.list({}, { signal: controller.signal });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    signal: controller.signal,
                }),
            );
        });

        it("validates PUT request with validate option", async () => {
            const userStore = createStore("user54", UserSchema, actions);

            await expect(userStore.action.replace({ id: 1, name: 123 as any }, { validate: true })).rejects.toThrow();
        });
    });

    describe("alias property", () => {
        it("returns correct entity name aliases", () => {
            const userStore = createStore("user60", UserSchema, actions);

            expect(userStore.alias.unit).toBe("user60");
            expect(userStore.alias.units).toBe("user60s");
        });

        it("pluralizes correctly for words ending in y", () => {
            const categoryStore = createStore("category", UserSchema, actions);

            expect(categoryStore.alias.unit).toBe("category");
            expect(categoryStore.alias.units).toBe("categories");
        });
    });

    describe("indicator property", () => {
        it("returns the indicator field name", () => {
            const userStore = createStore("user61", UserSchema, actions);

            expect(userStore.indicator).toBe("id");
        });

        it("returns custom indicator from schema meta", () => {
            const CustomSchema = z.object({
                uuid: z.string().meta({ indicator: true }),
                name: z.string(),
            });

            const customStore = createStore("custom61", CustomSchema, {});

            expect(customStore.indicator).toBe("uuid");
        });
    });

    describe("store property", () => {
        it("exposes underlying Harlem store", () => {
            const userStore = createStore("user62", UserSchema, actions);

            expect(userStore.store).toBeDefined();
            expect(userStore.store.state).toBeDefined();
        });
    });

    describe("default memory mutations by HTTP method", () => {
        it("GET on unit defaults to set", async () => {
            const testActions = {
                get: {
                    endpoint: Endpoint.get<User>((p) => `/users/${p.id}`),
                    memory: Memory.unit(), // No explicit mutation
                },
            };

            mockFetch.mockResolvedValueOnce({ id: 1, name: "John", email: "j@test.com", createdAt: "" });

            const userStore = createStore("user70", UserSchema, testActions);
            await userStore.action.get({ id: 1 });

            expect(userStore.unit.value).toEqual({ id: 1, name: "John", email: "j@test.com", createdAt: "" });
        });

        it("GET on units defaults to set", async () => {
            const testActions = {
                list: {
                    endpoint: Endpoint.get("/users"),
                    memory: Memory.units(), // No explicit mutation
                },
            };

            mockFetch.mockResolvedValueOnce([{ id: 1, name: "John", email: "j@test.com", createdAt: "" }]);

            const userStore = createStore("user71", UserSchema, testActions);
            await userStore.action.list();

            expect(userStore.units.value).toHaveLength(1);
        });

        it("POST on units defaults to add", async () => {
            const testActions = {
                create: {
                    endpoint: Endpoint.post("/users"),
                    memory: Memory.units(), // No explicit mutation, should default to add
                },
            };

            mockFetch.mockResolvedValueOnce({ id: 2, name: "New", email: "n@test.com", createdAt: "" });

            const userStore = createStore("user72", UserSchema, testActions);
            userStore.memory.set([{ id: 1, name: "Existing", email: "e@test.com", createdAt: "" }]);

            await userStore.action.create({ id: 0, name: "New", email: "n@test.com", createdAt: "" });

            expect(userStore.units.value).toHaveLength(2);
        });

        it("PATCH on units defaults to edit", async () => {
            const testActions = {
                update: {
                    endpoint: Endpoint.patch<User>((p) => `/users/${p.id}`),
                    memory: Memory.units(), // No explicit mutation, should default to edit
                },
            };

            mockFetch.mockResolvedValueOnce({ id: 1, name: "Updated" });

            const userStore = createStore("user73", UserSchema, testActions);
            userStore.memory.set([{ id: 1, name: "Original", email: "o@test.com", createdAt: "" }]);

            await userStore.action.update({ id: 1, name: "Updated" });

            expect(userStore.units.value[0].name).toBe("Updated");
            expect(userStore.units.value[0].email).toBe("o@test.com");
        });

        it("DELETE on units defaults to drop", async () => {
            const testActions = {
                delete: {
                    endpoint: Endpoint.delete<User>((p) => `/users/${p.id}`),
                    memory: Memory.units(), // No explicit mutation, should default to drop
                },
            };

            mockFetch.mockResolvedValueOnce({});

            const userStore = createStore("user74", UserSchema, testActions);
            userStore.memory.set([
                { id: 1, name: "John", email: "j@test.com", createdAt: "" },
                { id: 2, name: "Jane", email: "ja@test.com", createdAt: "" },
            ]);

            await userStore.action.delete({ id: 1 });

            expect(userStore.units.value).toHaveLength(1);
            expect(userStore.units.value[0].id).toBe(2);
        });
    });

    describe("index cache behavior", () => {
        it("edit finds correct item after multiple set operations", () => {
            const userStore = createStore("user80", UserSchema, actions);

            // First set
            userStore.memory.set([
                { id: 1, name: "John", email: "j@test.com", createdAt: "" },
                { id: 2, name: "Jane", email: "ja@test.com", createdAt: "" },
            ]);

            // Second set (replaces all)
            userStore.memory.set([
                { id: 3, name: "Bob", email: "b@test.com", createdAt: "" },
                { id: 4, name: "Alice", email: "a@test.com", createdAt: "" },
            ]);

            // Edit should find correct item in new array
            userStore.memory.edit({ id: 4, name: "Alice Updated" });

            expect(userStore.units.value[1].name).toBe("Alice Updated");
            expect(userStore.units.value[0].name).toBe("Bob");
        });

        it("edit works correctly after add with prepend", () => {
            const actionsWithPrepend = {
                create: {
                    endpoint: Endpoint.post("/users"),
                    memory: Memory.units().add({ prepend: true }),
                },
            };

            const userStore = createStore("user81", UserSchema, actionsWithPrepend);

            userStore.memory.set([{ id: 1, name: "Original", email: "o@test.com", createdAt: "" }]);

            // Simulate add with prepend
            mockFetch.mockResolvedValueOnce({ id: 2, name: "Prepended", email: "p@test.com", createdAt: "" });

            return userStore.action.create({ name: "Prepended", email: "p@test.com" }).then(() => {
                // Edit original item (now at index 1)
                userStore.memory.edit({ id: 1, name: "Original Updated" });

                expect(userStore.units.value[0].id).toBe(2);
                expect(userStore.units.value[1].id).toBe(1);
                expect(userStore.units.value[1].name).toBe("Original Updated");
            });
        });

        it("edit works correctly after drop", () => {
            const userStore = createStore("user82", UserSchema, actions);

            userStore.memory.set([
                { id: 1, name: "First", email: "f@test.com", createdAt: "" },
                { id: 2, name: "Second", email: "s@test.com", createdAt: "" },
                { id: 3, name: "Third", email: "t@test.com", createdAt: "" },
            ]);

            // Drop middle item (pass as array to drop from units)
            userStore.memory.drop([{ id: 2 }]);

            // Edit remaining items
            userStore.memory.edit({ id: 1, name: "First Updated" });
            userStore.memory.edit({ id: 3, name: "Third Updated" });

            expect(userStore.units.value).toHaveLength(2);
            expect(userStore.units.value[0].name).toBe("First Updated");
            expect(userStore.units.value[1].name).toBe("Third Updated");
        });

        it("handles edit for non-existent item gracefully", () => {
            const userStore = createStore("user83", UserSchema, actions);

            userStore.memory.set([{ id: 1, name: "Only", email: "o@test.com", createdAt: "" }]);

            // Edit non-existent item should not throw
            userStore.memory.edit({ id: 999, name: "Ghost" });

            // Original should be unchanged
            expect(userStore.units.value).toHaveLength(1);
            expect(userStore.units.value[0].name).toBe("Only");
        });

        it("handles large collections efficiently", () => {
            const userStore = createStore("user84", UserSchema, actions);

            // Create large collection
            const largeCollection = Array.from({ length: 1000 }, (_, i) => ({
                id: i + 1,
                name: `User ${i + 1}`,
                email: `user${i + 1}@test.com`,
                createdAt: "",
            }));

            userStore.memory.set(largeCollection);

            // Edit item in middle
            userStore.memory.edit({ id: 500, name: "Updated 500" });

            expect(userStore.units.value[499].name).toBe("Updated 500");
            expect(userStore.units.value).toHaveLength(1000);
        });

        it("syncs unit and units on edit", () => {
            const userStore = createStore("user85", UserSchema, actions);

            const user = { id: 1, name: "John", email: "j@test.com", createdAt: "" };

            // Set both unit and units
            userStore.memory.set(user);
            userStore.memory.set([user, { id: 2, name: "Jane", email: "ja@test.com", createdAt: "" }]);

            // Edit via single unit
            userStore.memory.edit({ id: 1, name: "John Updated" });

            // Both should be updated
            expect(userStore.unit.value?.name).toBe("John Updated");
            expect(userStore.units.value[0].name).toBe("John Updated");
        });
    });
});
