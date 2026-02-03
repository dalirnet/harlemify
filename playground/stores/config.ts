import { z } from "zod";

export enum ConfigAction {
    GET = "get",
    UPDATE = "update",
}

const configSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    theme: z.enum(["light", "dark"]).meta({
        actions: [ConfigAction.UPDATE],
    }),
    language: z.string().meta({
        actions: [ConfigAction.UPDATE],
    }),
    notifications: z.boolean().meta({
        actions: [ConfigAction.UPDATE],
    }),
});

const configActions = {
    [ConfigAction.GET]: {
        endpoint: Endpoint.get("/config"),
        memory: Memory.unit(),
    },
    [ConfigAction.UPDATE]: {
        endpoint: Endpoint.patch("/config"),
        memory: Memory.unit().edit(),
    },
};

export const configStore = createStore("config", configSchema, configActions);

export type Config = z.infer<typeof configSchema>;
