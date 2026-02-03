import { data } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, "id"));
    const index = data.projects.findIndex((p) => p.id === id);
    if (index === -1) {
        throw createError({ statusCode: 404, message: "Project not found" });
    }
    data.projects.splice(index, 1);
    return { success: true };
});
