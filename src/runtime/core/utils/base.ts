export function trimStart(value: string, char: string): string {
    return value.replace(new RegExp(`^${char}+`), "");
}

export function trimEnd(value: string, char: string): string {
    return value.replace(new RegExp(`${char}+$`), "");
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== "object") {
        return false;
    }

    if (Array.isArray(value)) {
        return false;
    }

    return true;
}

export function isEmptyRecord(record: Record<string, unknown> | undefined): record is undefined {
    if (!record) {
        return true;
    }

    if (Object.keys(record).length === 0) {
        return true;
    }

    return false;
}
