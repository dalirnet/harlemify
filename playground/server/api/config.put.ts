import { data } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    data.config = { ...body, id: data.config.id };

    return data.config;
});
