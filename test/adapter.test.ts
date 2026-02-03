import { describe, it, expect, vi, beforeEach } from "vitest";

import { defineApiAdapter } from "../src/runtime/utils/adapter";
import { ApiRequestError, ApiResponseError } from "../src/runtime/utils/errors";
import { EndpointMethod } from "../src/runtime/utils/endpoint";

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

describe("defineApiAdapter", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("basic usage", () => {
        it("creates adapter function", () => {
            const adapter = defineApiAdapter();

            expect(adapter).toBeInstanceOf(Function);
        });

        it("makes request with method and url", async () => {
            mockFetch.mockResolvedValueOnce({ id: 1 });

            const adapter = defineApiAdapter();
            await adapter({
                method: EndpointMethod.GET,
                url: "/users",
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    method: "get",
                }),
            );
        });

        it("returns data in response object", async () => {
            mockFetch.mockResolvedValueOnce({ id: 1, name: "John" });

            const adapter = defineApiAdapter();
            const response = await adapter({
                method: EndpointMethod.GET,
                url: "/users/1",
            });

            expect(response.data).toEqual({ id: 1, name: "John" });
        });
    });

    describe("options", () => {
        it("uses baseURL option", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter({ baseURL: "https://api.example.com" });
            await adapter({
                method: EndpointMethod.GET,
                url: "/users",
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    baseURL: "https://api.example.com",
                }),
            );
        });

        it("uses timeout option", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter({ timeout: 5000 });
            await adapter({
                method: EndpointMethod.GET,
                url: "/users",
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    timeout: 5000,
                }),
            );
        });

        it("uses retry option", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter({ retry: 3 });
            await adapter({
                method: EndpointMethod.GET,
                url: "/users",
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    retry: 3,
                }),
            );
        });

        it("uses retryDelay option", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter({ retryDelay: 1000 });
            await adapter({
                method: EndpointMethod.GET,
                url: "/users",
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    retryDelay: 1000,
                }),
            );
        });

        it("uses retryStatusCodes option", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter({ retryStatusCodes: [500, 502, 503] });
            await adapter({
                method: EndpointMethod.GET,
                url: "/users",
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    retryStatusCodes: [500, 502, 503],
                }),
            );
        });

        it("uses responseType option", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter({ responseType: "blob" });
            await adapter({
                method: EndpointMethod.GET,
                url: "/users",
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    responseType: "blob",
                }),
            );
        });

        it("combines multiple options", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter({
                baseURL: "https://api.example.com",
                timeout: 10000,
                retry: 2,
                retryDelay: 500,
            });
            await adapter({
                method: EndpointMethod.GET,
                url: "/users",
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    baseURL: "https://api.example.com",
                    timeout: 10000,
                    retry: 2,
                    retryDelay: 500,
                }),
            );
        });

        it("disables retry with false", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter({ retry: false });
            await adapter({
                method: EndpointMethod.GET,
                url: "/users",
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    retry: false,
                }),
            );
        });
    });

    describe("request properties", () => {
        it("passes headers to fetch", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter();
            await adapter({
                method: EndpointMethod.GET,
                url: "/users",
                headers: { Authorization: "Bearer token" },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    headers: { Authorization: "Bearer token" },
                }),
            );
        });

        it("passes query to fetch", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter();
            await adapter({
                method: EndpointMethod.GET,
                url: "/users",
                query: { page: 1, limit: 10 },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    query: { page: 1, limit: 10 },
                }),
            );
        });

        it("passes body to fetch", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter();
            await adapter({
                method: EndpointMethod.POST,
                url: "/users",
                body: { name: "John", email: "john@test.com" },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    body: { name: "John", email: "john@test.com" },
                }),
            );
        });

        it("passes signal to fetch", async () => {
            mockFetch.mockResolvedValueOnce({});

            const controller = new AbortController();
            const adapter = defineApiAdapter();
            await adapter({
                method: EndpointMethod.GET,
                url: "/users",
                signal: controller.signal,
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    signal: controller.signal,
                }),
            );
        });
    });

    describe("HTTP methods", () => {
        it("handles GET request", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter();
            await adapter({
                method: EndpointMethod.GET,
                url: "/users",
            });

            expect(mockFetch).toHaveBeenCalledWith("/users", expect.objectContaining({ method: "get" }));
        });

        it("handles POST request", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter();
            await adapter({
                method: EndpointMethod.POST,
                url: "/users",
                body: { name: "John" },
            });

            expect(mockFetch).toHaveBeenCalledWith("/users", expect.objectContaining({ method: "post" }));
        });

        it("handles PUT request", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter();
            await adapter({
                method: EndpointMethod.PUT,
                url: "/users/1",
                body: { name: "John" },
            });

            expect(mockFetch).toHaveBeenCalledWith("/users/1", expect.objectContaining({ method: "put" }));
        });

        it("handles PATCH request", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter();
            await adapter({
                method: EndpointMethod.PATCH,
                url: "/users/1",
                body: { name: "John" },
            });

            expect(mockFetch).toHaveBeenCalledWith("/users/1", expect.objectContaining({ method: "patch" }));
        });

        it("handles DELETE request", async () => {
            mockFetch.mockResolvedValueOnce({});

            const adapter = defineApiAdapter();
            await adapter({
                method: EndpointMethod.DELETE,
                url: "/users/1",
            });

            expect(mockFetch).toHaveBeenCalledWith("/users/1", expect.objectContaining({ method: "delete" }));
        });
    });

    describe("error handling", () => {
        it("throws ApiRequestError on request failure", async () => {
            const networkError = new Error("Network error");
            mockFetch.mockImplementationOnce((url, options) => {
                if (options.onRequestError) {
                    options.onRequestError({
                        request: url,
                        options,
                        error: networkError,
                    });
                }
                return Promise.reject(networkError);
            });

            const adapter = defineApiAdapter();

            await expect(
                adapter({
                    method: EndpointMethod.GET,
                    url: "/users",
                }),
            ).rejects.toThrow(ApiRequestError);
        });

        it("throws ApiResponseError on response failure", async () => {
            const responseError = new Error("Server error");
            mockFetch.mockImplementationOnce((url, options) => {
                if (options.onResponseError) {
                    options.onResponseError({
                        request: url,
                        options,
                        error: responseError,
                    });
                }
                return Promise.reject(responseError);
            });

            const adapter = defineApiAdapter();

            await expect(
                adapter({
                    method: EndpointMethod.GET,
                    url: "/users",
                }),
            ).rejects.toThrow(ApiResponseError);
        });

        it("includes method and url in request error", async () => {
            const networkError = new Error("Connection refused");
            mockFetch.mockImplementationOnce((url, options) => {
                if (options.onRequestError) {
                    options.onRequestError({
                        request: url,
                        options,
                        error: networkError,
                    });
                }
                return Promise.reject(networkError);
            });

            const adapter = defineApiAdapter();

            try {
                await adapter({
                    method: EndpointMethod.POST,
                    url: "/api/data",
                });
            } catch (error) {
                expect(error).toBeInstanceOf(ApiRequestError);
                expect((error as ApiRequestError).method).toBe("post");
                expect((error as ApiRequestError).url).toBe("/api/data");
                expect((error as ApiRequestError).message).toBe("Connection refused");
            }
        });

        it("includes method and url in response error", async () => {
            const responseError = new Error("Not Found");
            mockFetch.mockImplementationOnce((url, options) => {
                if (options.onResponseError) {
                    options.onResponseError({
                        request: url,
                        options,
                        error: responseError,
                    });
                }
                return Promise.reject(responseError);
            });

            const adapter = defineApiAdapter();

            try {
                await adapter({
                    method: EndpointMethod.GET,
                    url: "/users/999",
                });
            } catch (error) {
                expect(error).toBeInstanceOf(ApiResponseError);
                expect((error as ApiResponseError).method).toBe("get");
                expect((error as ApiResponseError).url).toBe("/users/999");
                expect((error as ApiResponseError).message).toBe("Not Found");
            }
        });
    });

    describe("typed responses", () => {
        it("returns typed data", async () => {
            interface User {
                id: number;
                name: string;
            }

            mockFetch.mockResolvedValueOnce({ id: 1, name: "John" });

            const adapter = defineApiAdapter<User>();
            const response = await adapter({
                method: EndpointMethod.GET,
                url: "/users/1",
            });

            expect(response.data.id).toBe(1);
            expect(response.data.name).toBe("John");
        });

        it("returns array typed data", async () => {
            interface User {
                id: number;
                name: string;
            }

            mockFetch.mockResolvedValueOnce([
                { id: 1, name: "John" },
                { id: 2, name: "Jane" },
            ]);

            const adapter = defineApiAdapter<User[]>();
            const response = await adapter({
                method: EndpointMethod.GET,
                url: "/users",
            });

            expect(response.data).toHaveLength(2);
            expect(response.data[0].name).toBe("John");
        });
    });
});
