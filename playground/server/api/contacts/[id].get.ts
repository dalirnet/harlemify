import { data } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, "id"));
    const contact = data.contacts.find((c) => c.id === id);
    if (!contact) {
        throw createError({ statusCode: 404, message: "Contact not found" });
    }
    return contact;
});
