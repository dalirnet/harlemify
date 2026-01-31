export type SharedConfig = {
    api?: {
        url?: string;
        timeout?: number;
    };
};

export const sharedConfig: SharedConfig = {
    api: {},
};
