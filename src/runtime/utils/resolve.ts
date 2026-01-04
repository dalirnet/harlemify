import { isRef, type Ref } from "vue";

export type Resolvable<T> = T | Ref<T> | (() => T);

export function resolve<T>(input: Resolvable<T>): T {
    if (isRef(input)) {
        input = input.value;
    }

    if (typeof input === "function") {
        input = (input as () => T)();
    }

    return input;
}
