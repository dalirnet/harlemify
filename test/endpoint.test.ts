import { describe, it, expect, vi } from "vitest";

import {
    Endpoint,
    EndpointStatus,
    makeEndpointStatusKey,
    getEndpoint,
    resolveEndpointUrl,
    makeEndpointsStatus,
    type EndpointDefinition,
} from "../src/runtime/utils/endpoint";

import { ApiAction } from "../src/runtime/core/api";

describe("makeEndpointStatusKey", () => {
    it("creates correct status keys", () => {
        expect(
            makeEndpointStatusKey(Endpoint.GET_UNIT, EndpointStatus.IDLE),
        ).toBe("getUnitIsIdle");
        expect(
            makeEndpointStatusKey(Endpoint.GET_UNITS, EndpointStatus.PENDING),
        ).toBe("getUnitsIsPending");
        expect(
            makeEndpointStatusKey(Endpoint.POST_UNIT, EndpointStatus.SUCCESS),
        ).toBe("postUnitIsSuccess");
        expect(
            makeEndpointStatusKey(Endpoint.DELETE_UNITS, EndpointStatus.FAILED),
        ).toBe("deleteUnitsIsFailed");
    });

    it("capitalizes status correctly", () => {
        const key = makeEndpointStatusKey(
            Endpoint.PATCH_UNIT,
            EndpointStatus.PENDING,
        );
        expect(key).toBe("patchUnitIsPending");
        expect(key).toContain("IsPending");
    });
});

describe("getEndpoint", () => {
    const endpoints: Partial<Record<Endpoint, EndpointDefinition>> = {
        [Endpoint.GET_UNIT]: {
            action: ApiAction.GET,
            url: "/users/:id",
        },
        [Endpoint.GET_UNITS]: {
            action: ApiAction.GET,
            url: "/users",
        },
    };

    it("returns endpoint when it exists", () => {
        const endpoint = getEndpoint(endpoints, Endpoint.GET_UNIT);
        expect(endpoint).toEqual({
            action: ApiAction.GET,
            url: "/users/:id",
        });
    });

    it("throws error when endpoint is not configured", () => {
        expect(() => getEndpoint(endpoints, Endpoint.PUT_UNIT)).toThrow(
            'Endpoint "putUnit" is not configured',
        );
    });

    it("throws error when endpoints is undefined", () => {
        expect(() => getEndpoint(undefined, Endpoint.GET_UNIT)).toThrow(
            'Endpoint "getUnit" is not configured',
        );
    });
});

describe("resolveEndpointUrl", () => {
    it("returns static url", () => {
        const endpoint: EndpointDefinition = {
            action: ApiAction.GET,
            url: "/users",
        };
        expect(resolveEndpointUrl(endpoint)).toBe("/users");
    });

    it("calls url function with params", () => {
        const endpoint: EndpointDefinition<{ id: number }> = {
            action: ApiAction.GET,
            url: (params) => `/users/${params.id}`,
        };
        expect(resolveEndpointUrl(endpoint, { id: 42 })).toBe("/users/42");
    });

    it("handles multiple params", () => {
        const endpoint: EndpointDefinition<{
            orgId: number;
            userId: number;
        }> = {
            action: ApiAction.GET,
            url: (params) => `/orgs/${params.orgId}/users/${params.userId}`,
        };
        expect(resolveEndpointUrl(endpoint, { orgId: 1, userId: 5 })).toBe(
            "/orgs/1/users/5",
        );
    });
});

describe("makeEndpointsStatus", () => {
    it("creates 40 status getters (10 endpoints * 4 statuses)", () => {
        const mockGetter = vi.fn(() => ({ value: false }));
        const result = makeEndpointsStatus(mockGetter);
        expect(Object.keys(result)).toHaveLength(40);
    });

    it("provides correct state checker function", () => {
        let capturedFn: ((state: any) => boolean) | null = null;

        const mockGetter = vi.fn(
            (name: string, fn: (state: any) => boolean) => {
                if (name === "getUnitsIsPending") {
                    capturedFn = fn;
                }
                return { value: false };
            },
        );

        makeEndpointsStatus(mockGetter);

        const stateWithPending = {
            endpoints: {
                [Endpoint.GET_UNITS]: { status: EndpointStatus.PENDING },
            },
        };
        const stateWithSuccess = {
            endpoints: {
                [Endpoint.GET_UNITS]: { status: EndpointStatus.SUCCESS },
            },
        };

        expect(capturedFn!(stateWithPending)).toBe(true);
        expect(capturedFn!(stateWithSuccess)).toBe(false);
    });
});
