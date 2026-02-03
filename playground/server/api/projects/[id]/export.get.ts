import { data } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, "id"));
    const project = data.projects.find((p) => p.id === id);
    if (!project) {
        throw createError({ statusCode: 404, message: "Project not found" });
    }

    // Read query params and headers (demonstrates call-time options)
    const query = getQuery(event);
    const format = (query.format as string) || "json";
    const includeStats = query.includeStats === "true";
    const exportHeader = getHeader(event, "X-Export-Request");

    // Returns export data - no memory storage, just returns the data
    const result: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        format,
        requestedBy: exportHeader || "unknown",
        summary: {
            id: project.id,
            name: project.name,
            active: project.active,
            totalMilestones: project.milestones.length,
            completedMilestones: project.milestones.filter((m) => m.done).length,
            budget: project.meta.budget,
        },
    };

    // Include additional stats if requested via query param
    if (includeStats) {
        result.stats = {
            completionRate:
                project.milestones.length > 0
                    ? Math.round((project.milestones.filter((m) => m.done).length / project.milestones.length) * 100)
                    : 0,
            budgetFormatted: `$${project.meta.budget.toLocaleString()}`,
            priority: project.meta.options.priority,
        };
    }

    return result;
});
