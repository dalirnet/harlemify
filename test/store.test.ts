import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

import {
    StoreMemoryPosition,
    StoreConfigurationError,
    createStore,
} from "../src/runtime/core/store";
import { ApiAction } from "../src/runtime/core/api";
import { Endpoint, EndpointStatus } from "../src/runtime/utils/endpoint";

vi.stubGlobal("useRuntimeConfig", () => ({
    public: { harlemify: { api: { url: "https://api.example.com" } } },
}));

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

const UserSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z
        .string()
        .meta({ actions: [ApiAction.POST, ApiAction.PUT, ApiAction.PATCH] }),
    email: z.string().meta({ actions: [ApiAction.POST] }),
    createdAt: z.string(),
});

type User = z.infer<typeof UserSchema>;

const endpoints = {
    [Endpoint.GET_UNIT]: {
        action: ApiAction.GET,
        url: (p: Partial<User>) => `/users/${p.id}`,
    },
    [Endpoint.GET_UNITS]: { action: ApiAction.GET, url: "/users" },
    [Endpoint.POST_UNIT]: { action: ApiAction.POST, url: "/users" },
    [Endpoint.POST_UNITS]: { action: ApiAction.POST, url: "/users" },
    [Endpoint.PUT_UNIT]: {
        action: ApiAction.PUT,
        url: (p: Partial<User>) => `/users/${p.id}`,
    },
    [Endpoint.PATCH_UNIT]: {
        action: ApiAction.PATCH,
        url: (p: Partial<User>) => `/users/${p.id}`,
    },
    [Endpoint.DELETE_UNIT]: {
        action: ApiAction.DELETE,
        url: (p: Partial<User>) => `/users/${p.id}`,
    },
    [Endpoint.DELETE_UNITS]: {
        action: ApiAction.DELETE,
        url: (p: Partial<User>) => `/users/${p.id}`,
    },
};

describe("StoreConfigurationError", () => {
    it("creates error with correct name and message", () => {
        const error = new StoreConfigurationError("Test error");
        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe("StoreConfigurationError");
        expect(error.message).toBe("Test error");
    });
});

describe("createStore", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("creates store with initial state and status getters", () => {
        const userStore = createStore("user1", UserSchema, endpoints);

        expect(userStore.memorizedUnit.value).toBeNull();
        expect(userStore.memorizedUnits.value).toEqual([]);
        expect(userStore.endpointsStatus.getUnitIsIdle).toBeDefined();
        expect(userStore.endpointsStatus.getUnitsIsPending).toBeDefined();
    });

    describe("mutations", () => {
        it("sets and clears memorizedUnit", () => {
            const userStore = createStore("user2", UserSchema, endpoints);
            const user: User = {
                id: 1,
                name: "John",
                email: "john@example.com",
                createdAt: "2024-01-01",
            };

            userStore.setMemorizedUnit(user);
            expect(userStore.memorizedUnit.value).toEqual(user);

            userStore.setMemorizedUnit(null);
            expect(userStore.memorizedUnit.value).toBeNull();
        });

        it("sets and clears memorizedUnits", () => {
            const userStore = createStore("user3", UserSchema, endpoints);
            const users: User[] = [
                {
                    id: 1,
                    name: "John",
                    email: "john@example.com",
                    createdAt: "2024-01-01",
                },
                {
                    id: 2,
                    name: "Jane",
                    email: "jane@example.com",
                    createdAt: "2024-01-02",
                },
            ];

            userStore.setMemorizedUnits(users);
            expect(userStore.memorizedUnits.value).toEqual(users);

            userStore.setMemorizedUnits([]);
            expect(userStore.memorizedUnits.value).toEqual([]);
        });

        it("edits memorizedUnit by indicator", () => {
            const userStore = createStore("user4", UserSchema, endpoints);
            userStore.setMemorizedUnit({
                id: 1,
                name: "John",
                email: "john@example.com",
                createdAt: "2024-01-01",
            });

            userStore.editMemorizedUnit({ id: 1, name: "John Doe" });
            expect(userStore.memorizedUnit.value?.name).toBe("John Doe");

            // Non-matching indicator should not modify
            userStore.editMemorizedUnit({ id: 2, name: "Jane" });
            expect(userStore.memorizedUnit.value?.name).toBe("John Doe");
        });

        it("edits memorizedUnits by indicator", () => {
            const userStore = createStore("user5", UserSchema, endpoints);
            userStore.setMemorizedUnits([
                {
                    id: 1,
                    name: "John",
                    email: "john@example.com",
                    createdAt: "2024-01-01",
                },
                {
                    id: 2,
                    name: "Jane",
                    email: "jane@example.com",
                    createdAt: "2024-01-02",
                },
            ]);

            userStore.editMemorizedUnits([
                { id: 1, name: "John Doe" },
                { id: 2, name: "Jane Doe" },
            ]);

            expect(userStore.memorizedUnits.value[0].name).toBe("John Doe");
            expect(userStore.memorizedUnits.value[1].name).toBe("Jane Doe");
        });

        it("drops memorizedUnit by indicator", () => {
            const userStore = createStore("user6", UserSchema, endpoints);
            userStore.setMemorizedUnit({
                id: 1,
                name: "John",
                email: "john@example.com",
                createdAt: "2024-01-01",
            });

            userStore.dropMemorizedUnit({ id: 2 });
            expect(userStore.memorizedUnit.value).not.toBeNull();

            userStore.dropMemorizedUnit({ id: 1 });
            expect(userStore.memorizedUnit.value).toBeNull();
        });

        it("drops memorizedUnits by indicator", () => {
            const userStore = createStore("user7", UserSchema, endpoints);
            userStore.setMemorizedUnits([
                {
                    id: 1,
                    name: "John",
                    email: "john@example.com",
                    createdAt: "2024-01-01",
                },
                {
                    id: 2,
                    name: "Jane",
                    email: "jane@example.com",
                    createdAt: "2024-01-02",
                },
                {
                    id: 3,
                    name: "Bob",
                    email: "bob@example.com",
                    createdAt: "2024-01-03",
                },
            ]);

            userStore.dropMemorizedUnits([{ id: 1 }, { id: 3 }]);

            expect(userStore.memorizedUnits.value).toHaveLength(1);
            expect(userStore.memorizedUnits.value[0].id).toBe(2);
        });
    });

    describe("hasMemorizedUnits", () => {
        it("returns existence map by indicator", () => {
            const userStore = createStore("user8", UserSchema, endpoints);
            userStore.setMemorizedUnits([
                {
                    id: 1,
                    name: "John",
                    email: "john@example.com",
                    createdAt: "2024-01-01",
                },
            ]);

            const result = userStore.hasMemorizedUnits({ id: 1 }, { id: 99 });

            expect(result[1]).toBe(true);
            expect(result[99]).toBe(false);
        });
    });

    describe("endpoint memory", () => {
        it("patches and purges endpoint status", () => {
            const userStore = createStore("user9", UserSchema, endpoints);

            userStore.patchEndpointMemory({
                key: Endpoint.GET_UNITS,
                memory: { status: EndpointStatus.SUCCESS },
            });
            expect(userStore.endpointsStatus.getUnitsIsSuccess.value).toBe(
                true,
            );

            userStore.purgeEndpointMemory();
            expect(userStore.endpointsStatus.getUnitsIsSuccess.value).toBe(
                false,
            );
        });
    });

    describe("custom indicator", () => {
        it("uses custom indicator from options", () => {
            const CustomSchema = z.object({
                uuid: z.string(),
                name: z.string(),
            });
            const customStore = createStore(
                "custom",
                CustomSchema,
                {},
                { indicator: "uuid" },
            );

            customStore.setMemorizedUnits([
                { uuid: "abc-123", name: "Item 1" },
            ]);

            const result = customStore.hasMemorizedUnits({ uuid: "abc-123" });
            expect(result["abc-123"]).toBe(true);
        });
    });

    describe("lifecycle hooks", () => {
        it("calls before and after hooks on success", async () => {
            const beforeHook = vi.fn();
            const afterHook = vi.fn();
            mockFetch.mockResolvedValueOnce([]);

            const userStore = createStore("user10", UserSchema, endpoints, {
                hooks: { before: beforeHook, after: afterHook },
            });

            await userStore.getUnits();

            expect(beforeHook).toHaveBeenCalledTimes(1);
            expect(afterHook).toHaveBeenCalledWith();
        });

        it("calls after hook with error on failure", async () => {
            const afterHook = vi.fn();
            const error = new Error("API Error");
            mockFetch.mockRejectedValueOnce(error);

            const userStore = createStore("user11", UserSchema, endpoints, {
                hooks: { after: afterHook },
            });

            await expect(userStore.getUnits()).rejects.toThrow("API Error");
            expect(afterHook).toHaveBeenCalledWith(error);
        });
    });

    describe("API actions", () => {
        it("getUnit fetches and stores single unit", async () => {
            const user = {
                id: 1,
                name: "John",
                email: "john@example.com",
                createdAt: "2024-01-01",
            };
            mockFetch.mockResolvedValueOnce(user);

            const userStore = createStore("user12", UserSchema, endpoints);
            const result = await userStore.getUnit({ id: 1 });

            expect(result).toEqual(user);
            expect(userStore.memorizedUnit.value).toEqual(user);
        });

        it("getUnits fetches and stores multiple units", async () => {
            const users = [
                { id: 1, name: "John", email: "john@example.com" },
                { id: 2, name: "Jane", email: "jane@example.com" },
            ];
            mockFetch.mockResolvedValueOnce(users);

            const userStore = createStore("user13", UserSchema, endpoints);
            const result = await userStore.getUnits();

            expect(result).toEqual(users);
            expect(userStore.memorizedUnits.value).toEqual(users);
        });

        it("postUnit creates and merges response into memory", async () => {
            mockFetch.mockResolvedValueOnce({ id: 1, createdAt: "2024-01-01" });

            const userStore = createStore("user14", UserSchema, endpoints);
            await userStore.postUnit({
                id: 0,
                name: "New",
                email: "new@example.com",
                createdAt: "",
            });

            expect(userStore.memorizedUnit.value?.id).toBe(1);
            expect(userStore.memorizedUnit.value?.name).toBe("New");
        });

        it("postUnits adds to beginning by default, end with LAST", async () => {
            mockFetch.mockResolvedValue({ id: 10 });

            const userStore = createStore("user15", UserSchema, endpoints);
            userStore.setMemorizedUnits([
                { id: 1, name: "Existing", email: "e@e.com", createdAt: "" },
            ]);

            await userStore.postUnits([
                { id: 0, name: "New", email: "n@n.com", createdAt: "" },
            ]);
            expect(userStore.memorizedUnits.value[0].id).toBe(10);

            await userStore.postUnits(
                [{ id: 0, name: "Last", email: "l@l.com", createdAt: "" }],
                { position: StoreMemoryPosition.LAST },
            );
            expect(
                userStore.memorizedUnits.value[
                    userStore.memorizedUnits.value.length - 1
                ].name,
            ).toBe("Last");
        });

        it("patchUnit partially updates existing unit", async () => {
            mockFetch.mockResolvedValueOnce({ id: 1, name: "Updated" });

            const userStore = createStore("user16", UserSchema, endpoints);
            userStore.setMemorizedUnit({
                id: 1,
                name: "Original",
                email: "test@e.com",
                createdAt: "",
            });

            await userStore.patchUnit({ id: 1, name: "Updated" });

            expect(userStore.memorizedUnit.value?.name).toBe("Updated");
            expect(userStore.memorizedUnit.value?.email).toBe("test@e.com");
        });

        it("deleteUnit removes unit from memory", async () => {
            mockFetch.mockResolvedValueOnce({});

            const userStore = createStore("user17", UserSchema, endpoints);
            userStore.setMemorizedUnit({
                id: 1,
                name: "John",
                email: "j@e.com",
                createdAt: "",
            });

            await userStore.deleteUnit({ id: 1 });

            expect(userStore.memorizedUnit.value).toBeNull();
        });

        it("deleteUnits removes multiple units from memory", async () => {
            mockFetch.mockResolvedValue({});

            const userStore = createStore("user18", UserSchema, endpoints);
            userStore.setMemorizedUnits([
                { id: 1, name: "John", email: "j@e.com", createdAt: "" },
                { id: 2, name: "Jane", email: "ja@e.com", createdAt: "" },
            ]);

            await userStore.deleteUnits([{ id: 1 }]);

            expect(userStore.memorizedUnits.value).toHaveLength(1);
            expect(userStore.memorizedUnits.value[0].id).toBe(2);
        });
    });

    describe("endpoint status transitions", () => {
        it("transitions to SUCCESS on success", async () => {
            mockFetch.mockResolvedValueOnce([]);
            const userStore = createStore("user19", UserSchema, endpoints);

            await userStore.getUnits();

            expect(userStore.endpointsStatus.getUnitsIsSuccess.value).toBe(
                true,
            );
        });

        it("transitions to FAILED on error", async () => {
            mockFetch.mockRejectedValueOnce(new Error("API Error"));
            const userStore = createStore("user20", UserSchema, endpoints);

            await expect(userStore.getUnits()).rejects.toThrow();

            expect(userStore.endpointsStatus.getUnitsIsFailed.value).toBe(true);
        });

        it("throws if endpoint is already pending", async () => {
            const userStore = createStore("user21", UserSchema, endpoints);
            userStore.patchEndpointMemory({
                key: Endpoint.GET_UNITS,
                memory: { status: EndpointStatus.PENDING },
            });

            await expect(userStore.getUnits()).rejects.toThrow(
                'Endpoint "getUnits" is already pending',
            );
        });

        it("throws if endpoint is not configured", async () => {
            const userStore = createStore("user22", UserSchema, {});

            await expect(userStore.getUnits()).rejects.toThrow(
                'Endpoint "getUnits" is not configured',
            );
        });
    });
});
