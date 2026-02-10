import { data } from "~/server/utils/data";
import type { TeamMember } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const name = getRouterParam(event, "name") as string;
    const body = await readBody<TeamMember[]>(event);
    data.teams[name] = body;
    return { [name]: data.teams[name] };
});
