import { data } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, "id"));
    const project = data.projects.find((p) => p.id === id);
    if (!project) {
        throw createError({ statusCode: 404, message: "Project not found" });
    }
    // Returns just the milestones array - stored in unit.milestones via Memory.unit("milestones")
    return project.milestones;
});
