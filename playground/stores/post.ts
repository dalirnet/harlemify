import { z } from "zod";

export enum PostAction {
    LIST = "list",
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
}

const postSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    userId: z.number().meta({
        actions: [PostAction.CREATE],
    }),
    title: z.string().meta({
        actions: [PostAction.CREATE, PostAction.UPDATE],
    }),
    body: z.string().meta({
        actions: [PostAction.CREATE, PostAction.UPDATE],
    }),
});

const postActions = {
    [PostAction.LIST]: {
        endpoint: Endpoint.get("/posts"),
        memory: Memory.units(),
    },
    [PostAction.CREATE]: {
        endpoint: Endpoint.post("/posts"),
        memory: Memory.units().add(),
    },
    [PostAction.UPDATE]: {
        endpoint: Endpoint.patch<Post>((params) => {
            return `/posts/${params.id}`;
        }),
        memory: Memory.units().edit(),
    },
    [PostAction.DELETE]: {
        endpoint: Endpoint.delete<Post>((params) => {
            return `/posts/${params.id}`;
        }),
        memory: Memory.units().drop(),
    },
};

export const postStore = createStore("post", postSchema, postActions);

export type Post = z.infer<typeof postSchema>;
