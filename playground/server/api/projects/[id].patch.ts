import { data } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const id = Number(getRouterParam(event, "id"));
    const body = await readBody(event);
    const index = data.projects.findIndex((p) => p.id === id);
    if (index === -1) {
        throw createError({ statusCode: 404, message: "Project not found" });
    }
    data.projects[index] = { ...data.projects[index], ...body };
    return data.projects[index];
});
