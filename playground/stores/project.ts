import { z } from "zod";

export enum ProjectAction {
    GET = "get",
    LIST = "list",
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
    TOGGLE = "toggle",
    MILESTONES = "milestones",
    META = "meta",
    OPTIONS = "options",
    EXPORT = "export",
}

const projectSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        actions: [ProjectAction.CREATE, ProjectAction.UPDATE],
    }),
    description: z.string().meta({
        actions: [ProjectAction.CREATE, ProjectAction.UPDATE],
    }),
    active: z.boolean(),
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

const projectActions = {
    [ProjectAction.GET]: {
        endpoint: Endpoint.get<Project>((params) => {
            return `/projects/${params.id}`;
        }),
        memory: Memory.unit(),
    },
    [ProjectAction.LIST]: {
        endpoint: Endpoint.get("/projects"),
        memory: Memory.units(),
    },
    [ProjectAction.CREATE]: {
        endpoint: Endpoint.post("/projects"),
        memory: Memory.units().add({ prepend: true }),
    },
    [ProjectAction.UPDATE]: {
        endpoint: Endpoint.patch<Project>((params) => {
            return `/projects/${params.id}`;
        }),
        memory: Memory.unit().edit(),
    },
    [ProjectAction.DELETE]: {
        endpoint: Endpoint.delete<Project>((params) => {
            return `/projects/${params.id}`;
        }),
        memory: Memory.units().drop(),
    },
    [ProjectAction.TOGGLE]: {
        endpoint: Endpoint.put<Project>((params) => {
            return `/projects/${params.id}/toggle`;
        }),
        memory: Memory.unit().edit(),
    },
    [ProjectAction.MILESTONES]: {
        endpoint: Endpoint.get<Project>((params) => {
            return `/projects/${params.id}/milestones`;
        }),
        memory: Memory.unit("milestones"),
    },
    [ProjectAction.META]: {
        endpoint: Endpoint.get<Project>((params) => {
            return `/projects/${params.id}/meta`;
        }),
        memory: Memory.unit("meta"),
    },
    [ProjectAction.OPTIONS]: {
        endpoint: Endpoint.get<Project>((params) => {
            return `/projects/${params.id}/options`;
        }),
        memory: Memory.unit("meta", "options").edit({ deep: true }),
    },
    [ProjectAction.EXPORT]: {
        endpoint: Endpoint.get<Project>((params) => {
            return `/projects/${params.id}/export`;
        }),
    },
};

export const projectStore = createStore("project", projectSchema, projectActions);

export type Project = z.infer<typeof projectSchema>;
export type ProjectMilestone = Project["milestones"][number];
export type ProjectMeta = Project["meta"];
export type ProjectOptions = Project["meta"]["options"];
