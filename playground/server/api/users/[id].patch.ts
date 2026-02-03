import { data } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const id = Number(getRouterParam(event, "id"));
    const body = await readBody(event);
    const index = data.users.findIndex((u) => u.id === id);
    if (index === -1) {
        throw createError({ statusCode: 404, message: "User not found" });
    }
    data.users[index] = { ...data.users[index], ...body };
    return data.users[index];
});
