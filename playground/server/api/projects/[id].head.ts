import { data } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, "id"));
    const project = data.projects.find((p) => p.id === id);
    if (!project) {
        throw createError({ statusCode: 404, message: "Project not found" });
    }
    setResponseHeader(event, "X-Project-Active", String(project.active));
    setResponseHeader(event, "X-Project-Milestones", String(project.milestones.length));
    return null;
});
