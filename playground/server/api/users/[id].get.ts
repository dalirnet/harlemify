import { data } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, "id"));
    const user = data.users.find((u) => u.id === id);
    if (!user) {
        throw createError({ statusCode: 404, message: "User not found" });
    }
    return user;
});
