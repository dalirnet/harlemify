import { z } from "zod";

export enum UserAction {
    GET = "get",
    LIST = "list",
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
}

const userSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        actions: [UserAction.CREATE, UserAction.UPDATE],
    }),
    email: z.email().meta({
        actions: [UserAction.CREATE, UserAction.UPDATE],
    }),
});

const loggingAdapter = defineApiAdapter({
    baseURL: "/api",
    timeout: 5000,
});

const detailAdapter: ApiAdapter<User> = async (request) => {
    console.log(`[DetailAdapter] Fetching user: ${request.url}`);
    const start = Date.now();

    const data = await $fetch<User>(request.url, {
        baseURL: "/api",
        method: request.method,
        headers: request.headers as HeadersInit,
        query: request.query,
        timeout: 15000,
    });

    console.log(`[DetailAdapter] Completed in ${Date.now() - start}ms`);

    return { data };
};

const userActions = {
    [UserAction.GET]: {
        endpoint: Endpoint.get<User>((params) => {
            return `/users/${params.id}`;
        }).withAdapter(detailAdapter),
        memory: Memory.unit(),
    },
    [UserAction.LIST]: {
        endpoint: Endpoint.get("/users"),
        memory: Memory.units(),
    },
    [UserAction.CREATE]: {
        endpoint: Endpoint.post("/users"),
        memory: Memory.units().add(),
    },
    [UserAction.UPDATE]: {
        endpoint: Endpoint.patch<User>((params) => {
            return `/users/${params.id}`;
        }),
        memory: Memory.units().edit(),
    },
    [UserAction.DELETE]: {
        endpoint: Endpoint.delete<User>((params) => {
            return `/users/${params.id}`;
        }),
        memory: Memory.units().drop(),
    },
};

export const userStore = createStore("user", userSchema, userActions, {
    adapter: loggingAdapter,
});

// Export schema for UI usage (demonstrates schema meta)
export { userSchema };

export type User = z.infer<typeof userSchema>;
