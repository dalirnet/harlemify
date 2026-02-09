import { data } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, "id"));
    const index = data.contacts.findIndex((c) => c.id === id);
    if (index === -1) {
        throw createError({ statusCode: 404, message: "Contact not found" });
    }
    const deleted = data.contacts.splice(index, 1)[0];
    return deleted;
});
