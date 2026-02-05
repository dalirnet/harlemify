export interface Cache<K, V> {
    map: Map<K, V>;
    get(key: K): V | undefined;
    set(key: K, value: V): Map<K, V>;
    unset(key: K): boolean;
}

export function createCache<K, V>(): Cache<K, V> {
    const map = new Map<K, V>();

    function get(key: K, fallback?: V | undefined): V | undefined {
        return map.get(key) ?? fallback;
    }

    function set(key: K, value: V): Map<K, V> {
        return map.set(key, value);
    }

    function unset(key: K): boolean {
        return map.delete(key);
    }

    return {
        map,
        get,
        set,
        unset,
    };
}
