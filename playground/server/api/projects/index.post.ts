import { data, getNextProjectId } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const newProject = {
        id: getNextProjectId(),
        name: body.name || "New Project",
        description: body.description || "",
        active: false,
        milestones: [],
        meta: {
            deadline: "2025-12-31",
            budget: 0,
            options: {
                notify: true,
                priority: 3,
            },
        },
    };
    data.projects.unshift(newProject);
    return newProject;
});
