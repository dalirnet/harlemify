import { describe, it, expect } from "vitest";

import {
    EndpointMethod,
    EndpointStatus,
    Endpoint,
    makeEndpointStatusFlag,
    resolveEndpointUrl,
} from "../src/runtime/utils/endpoint";
import type { EndpointDefinition } from "../src/runtime/utils/endpoint";

describe("makeEndpointStatusFlag", () => {
    it("creates correct status flag for IDLE", () => {
        expect(makeEndpointStatusFlag(EndpointStatus.IDLE)).toBe("IsIdle");
    });

    it("creates correct status flag for PENDING", () => {
        expect(makeEndpointStatusFlag(EndpointStatus.PENDING)).toBe("IsPending");
    });

    it("creates correct status flag for SUCCESS", () => {
        expect(makeEndpointStatusFlag(EndpointStatus.SUCCESS)).toBe("IsSuccess");
    });

    it("creates correct status flag for FAILED", () => {
        expect(makeEndpointStatusFlag(EndpointStatus.FAILED)).toBe("IsFailed");
    });
});

describe("Endpoint builder", () => {
    it("creates GET endpoint with static URL", () => {
        const endpoint = Endpoint.get("/users");

        expect(endpoint.method).toBe(EndpointMethod.GET);
        expect(endpoint.url).toBe("/users");
        expect(endpoint.adapter).toBeUndefined();
    });

    it("creates POST endpoint with static URL", () => {
        const endpoint = Endpoint.post("/users");

        expect(endpoint.method).toBe(EndpointMethod.POST);
        expect(endpoint.url).toBe("/users");
    });

    it("creates PUT endpoint with static URL", () => {
        const endpoint = Endpoint.put("/users");

        expect(endpoint.method).toBe(EndpointMethod.PUT);
        expect(endpoint.url).toBe("/users");
    });

    it("creates PATCH endpoint with static URL", () => {
        const endpoint = Endpoint.patch("/users");

        expect(endpoint.method).toBe(EndpointMethod.PATCH);
        expect(endpoint.url).toBe("/users");
    });

    it("creates DELETE endpoint with static URL", () => {
        const endpoint = Endpoint.delete("/users");

        expect(endpoint.method).toBe(EndpointMethod.DELETE);
        expect(endpoint.url).toBe("/users");
    });

    it("creates endpoint with dynamic URL function", () => {
        const endpoint = Endpoint.get<{ id: number }>((p) => `/users/${p.id}`);

        expect(endpoint.method).toBe(EndpointMethod.GET);
        expect(typeof endpoint.url).toBe("function");
    });

    it("chains withAdapter method", () => {
        const mockAdapter = async () => ({ data: {} });
        const endpoint = Endpoint.get("/users").withAdapter(mockAdapter);

        expect(endpoint.method).toBe(EndpointMethod.GET);
        expect(endpoint.url).toBe("/users");
        expect(endpoint.adapter).toBe(mockAdapter);
    });

    it("withAdapter chain returns new object", () => {
        const mockAdapter = async () => ({ data: {} });
        const base = Endpoint.get("/users");
        const withAdapterResult = base.withAdapter(mockAdapter);

        expect(base.adapter).toBeUndefined();
        expect(withAdapterResult.adapter).toBe(mockAdapter);
    });
});

describe("resolveEndpointUrl", () => {
    it("returns static url", () => {
        const endpoint: EndpointDefinition = {
            method: EndpointMethod.GET,
            url: "/users",
        };
        expect(resolveEndpointUrl(endpoint)).toBe("/users");
    });

    it("calls url function with params", () => {
        const endpoint: EndpointDefinition<{ id: number }> = {
            method: EndpointMethod.GET,
            url: (params) => `/users/${params.id}`,
        };
        expect(resolveEndpointUrl(endpoint, { id: 42 })).toBe("/users/42");
    });

    it("handles multiple params", () => {
        const endpoint: EndpointDefinition<{
            orgId: number;
            userId: number;
        }> = {
            method: EndpointMethod.GET,
            url: (params) => `/orgs/${params.orgId}/users/${params.userId}`,
        };
        expect(resolveEndpointUrl(endpoint, { orgId: 1, userId: 5 })).toBe("/orgs/1/users/5");
    });

    it("handles empty params with function URL", () => {
        const endpoint: EndpointDefinition<{ id?: number }> = {
            method: EndpointMethod.GET,
            url: (params) => `/users/${params.id ?? "all"}`,
        };
        expect(resolveEndpointUrl(endpoint)).toBe("/users/all");
    });
});
