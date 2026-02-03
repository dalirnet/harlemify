import { describe, it, expect } from "vitest";

import { Memory, createMemoryBuilder } from "../src/runtime/utils/memory";

describe("Memory builder", () => {
    describe("unit()", () => {
        it("creates unit memory definition with empty path", () => {
            const mem = Memory.unit();

            expect(mem.on).toBe("unit");
            expect(mem.path).toEqual([]);
            expect(mem.mutation).toBeUndefined();
        });

        it("creates unit memory with single nested path", () => {
            const mem = Memory.unit("steps");

            expect(mem.on).toBe("unit");
            expect(mem.path).toEqual(["steps"]);
        });

        it("creates unit memory with two-level nested path", () => {
            const mem = Memory.unit("settings", "config");

            expect(mem.on).toBe("unit");
            expect(mem.path).toEqual(["settings", "config"]);
        });

        it("chains set() mutation", () => {
            const mem = Memory.unit().set();

            expect(mem.on).toBe("unit");
            expect(mem.mutation).toBe("set");
        });

        it("chains edit() mutation with shallow merge (default)", () => {
            const mem = Memory.unit().edit();

            expect(mem.on).toBe("unit");
            expect(mem.mutation).toBe("edit");
            expect(mem.deep).toBeUndefined();
        });

        it("chains edit() mutation with deep merge option", () => {
            const mem = Memory.unit().edit({ deep: true });

            expect(mem.on).toBe("unit");
            expect(mem.mutation).toBe("edit");
            expect(mem.deep).toBe(true);
        });

        it("chains drop() mutation", () => {
            const mem = Memory.unit().drop();

            expect(mem.on).toBe("unit");
            expect(mem.mutation).toBe("drop");
        });

        it("nested path with mutation", () => {
            const mem = Memory.unit("data").edit();

            expect(mem.on).toBe("unit");
            expect(mem.path).toEqual(["data"]);
            expect(mem.mutation).toBe("edit");
        });
    });

    describe("units()", () => {
        it("creates units memory definition with empty path", () => {
            const mem = Memory.units();

            expect(mem.on).toBe("units");
            expect(mem.path).toEqual([]);
            expect(mem.mutation).toBeUndefined();
        });

        it("chains set() mutation", () => {
            const mem = Memory.units().set();

            expect(mem.on).toBe("units");
            expect(mem.mutation).toBe("set");
        });

        it("chains edit() mutation with shallow merge (default)", () => {
            const mem = Memory.units().edit();

            expect(mem.on).toBe("units");
            expect(mem.mutation).toBe("edit");
            expect(mem.deep).toBeUndefined();
        });

        it("chains edit() mutation with deep merge option", () => {
            const mem = Memory.units().edit({ deep: true });

            expect(mem.on).toBe("units");
            expect(mem.mutation).toBe("edit");
            expect(mem.deep).toBe(true);
        });

        it("chains drop() mutation", () => {
            const mem = Memory.units().drop();

            expect(mem.on).toBe("units");
            expect(mem.mutation).toBe("drop");
        });

        it("chains add() mutation with default append behavior", () => {
            const mem = Memory.units().add();

            expect(mem.on).toBe("units");
            expect(mem.mutation).toBe("add");
            expect(mem.prepend).toBeUndefined();
        });

        it("chains add({ prepend: true }) mutation", () => {
            const mem = Memory.units().add({ prepend: true });

            expect(mem.on).toBe("units");
            expect(mem.mutation).toBe("add");
            expect(mem.prepend).toBe(true);
        });
    });

    describe("createMemoryBuilder()", () => {
        it("creates typed memory builder", () => {
            interface User {
                id: number;
                name: string;
                profile: {
                    avatar: string;
                };
            }

            const UserMemory = createMemoryBuilder<User>();

            // These should work with type checking
            const unitMem = UserMemory.unit();
            const unitsMem = UserMemory.units();

            expect(unitMem.on).toBe("unit");
            expect(unitsMem.on).toBe("units");
        });
    });
});
