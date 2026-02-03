import { describe, it, expect } from "vitest";

import { ApiErrorSource, ApiError, ApiRequestError, ApiResponseError } from "../src/runtime/utils/errors";

describe("ApiErrorSource enum", () => {
    it("has REQUEST value", () => {
        expect(ApiErrorSource.REQUEST).toBe("request");
    });

    it("has RESPONSE value", () => {
        expect(ApiErrorSource.RESPONSE).toBe("response");
    });
});

describe("ApiError", () => {
    it("creates error with all properties", () => {
        const error = new ApiError({
            source: ApiErrorSource.REQUEST,
            method: "GET",
            url: "/users",
            message: "Network error",
        });

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe("ApiError");
        expect(error.source).toBe(ApiErrorSource.REQUEST);
        expect(error.method).toBe("GET");
        expect(error.url).toBe("/users");
        expect(error.message).toBe("Network error");
    });

    it("uses default message when not provided", () => {
        const error = new ApiError({
            source: ApiErrorSource.RESPONSE,
            method: "POST",
            url: "/users",
        });

        expect(error.message).toBe("Unknown error");
    });

    it("works with RESPONSE source", () => {
        const error = new ApiError({
            source: ApiErrorSource.RESPONSE,
            method: "DELETE",
            url: "/users/1",
            message: "Not Found",
        });

        expect(error.source).toBe(ApiErrorSource.RESPONSE);
    });

    it("is throwable and catchable", () => {
        const error = new ApiError({
            source: ApiErrorSource.REQUEST,
            method: "GET",
            url: "/test",
        });

        expect(() => {
            throw error;
        }).toThrow(ApiError);
    });

    it("preserves stack trace", () => {
        const error = new ApiError({
            source: ApiErrorSource.REQUEST,
            method: "GET",
            url: "/test",
        });

        expect(error.stack).toBeDefined();
    });
});

describe("ApiRequestError", () => {
    it("extends ApiError", () => {
        const error = new ApiRequestError({
            method: "GET",
            url: "/users",
            message: "Timeout",
        });

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toBeInstanceOf(Error);
    });

    it("automatically sets REQUEST source", () => {
        const error = new ApiRequestError({
            method: "GET",
            url: "/users",
            message: "Timeout",
        });

        expect(error.source).toBe(ApiErrorSource.REQUEST);
    });

    it("accepts method and url", () => {
        const error = new ApiRequestError({
            method: "POST",
            url: "/api/data",
            message: "Connection refused",
        });

        expect(error.method).toBe("POST");
        expect(error.url).toBe("/api/data");
        expect(error.message).toBe("Connection refused");
    });

    it("uses default message when not provided", () => {
        const error = new ApiRequestError({
            method: "GET",
            url: "/test",
        });

        expect(error.message).toBe("Unknown error");
    });

    it("can be caught specifically", () => {
        try {
            throw new ApiRequestError({
                method: "GET",
                url: "/test",
            });
        } catch (e) {
            expect(e).toBeInstanceOf(ApiRequestError);
            expect((e as ApiRequestError).source).toBe(ApiErrorSource.REQUEST);
        }
    });
});

describe("ApiResponseError", () => {
    it("extends ApiError", () => {
        const error = new ApiResponseError({
            method: "POST",
            url: "/users",
            message: "Not Found",
        });

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toBeInstanceOf(Error);
    });

    it("automatically sets RESPONSE source", () => {
        const error = new ApiResponseError({
            method: "POST",
            url: "/users",
            message: "Not Found",
        });

        expect(error.source).toBe(ApiErrorSource.RESPONSE);
    });

    it("accepts method and url", () => {
        const error = new ApiResponseError({
            method: "PUT",
            url: "/api/update",
            message: "Server Error",
        });

        expect(error.method).toBe("PUT");
        expect(error.url).toBe("/api/update");
        expect(error.message).toBe("Server Error");
    });

    it("uses default message when not provided", () => {
        const error = new ApiResponseError({
            method: "DELETE",
            url: "/test",
        });

        expect(error.message).toBe("Unknown error");
    });

    it("can be caught specifically", () => {
        try {
            throw new ApiResponseError({
                method: "GET",
                url: "/test",
            });
        } catch (e) {
            expect(e).toBeInstanceOf(ApiResponseError);
            expect((e as ApiResponseError).source).toBe(ApiErrorSource.RESPONSE);
        }
    });
});

describe("Error differentiation", () => {
    it("can distinguish between request and response errors", () => {
        const requestError = new ApiRequestError({
            method: "GET",
            url: "/test",
        });

        const responseError = new ApiResponseError({
            method: "GET",
            url: "/test",
        });

        expect(requestError.source).toBe(ApiErrorSource.REQUEST);
        expect(responseError.source).toBe(ApiErrorSource.RESPONSE);

        expect(requestError).toBeInstanceOf(ApiRequestError);
        expect(requestError).not.toBeInstanceOf(ApiResponseError);

        expect(responseError).toBeInstanceOf(ApiResponseError);
        expect(responseError).not.toBeInstanceOf(ApiRequestError);
    });

    it("both inherit from ApiError", () => {
        const requestError = new ApiRequestError({
            method: "GET",
            url: "/test",
        });

        const responseError = new ApiResponseError({
            method: "GET",
            url: "/test",
        });

        expect(requestError).toBeInstanceOf(ApiError);
        expect(responseError).toBeInstanceOf(ApiError);
    });
});
