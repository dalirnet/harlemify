import { data } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const id = Number(getRouterParam(event, "id"));
    const body = await readBody(event);
    const index = data.contacts.findIndex((c) => c.id === id);
    if (index === -1) {
        throw createError({ statusCode: 404, message: "Contact not found" });
    }
    data.contacts[index] = { ...data.contacts[index], ...body };
    return data.contacts[index];
});
