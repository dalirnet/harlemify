import { data } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const name = getRouterParam(event, "name") as string;
    const members = data.teams[name];
    if (!members) {
        throw createError({ statusCode: 404, message: "Team not found" });
    }
    return { [name]: members };
});
