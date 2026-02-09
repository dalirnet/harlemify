import { data, getNextContactId } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const contact = { ...body, id: getNextContactId() };
    data.contacts.push(contact);
    return contact;
});
