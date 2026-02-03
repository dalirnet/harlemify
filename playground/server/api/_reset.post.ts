import { resetData } from "../utils/data";

export default defineEventHandler(() => {
    resetData();
    return { ok: true };
});
