type User = {
    username: string;
    roles: Partial<{
        dev: boolean;
    }>;
}

type ENV = {
    env: 'dev' | 'prod';
    bots: {
        name: string;
        username: string;
        token: string;
        env: 'dev' | 'prod';
    }[];
    devUser: User;
    users: [string, User][];
    chats: [string, Chat][];
}

declare const env: ENV & { isDev: boolean, bot: ENV['bots'][0] };
declare const mainFileDirectory: string;
declare function log(...message: any[]): void

type Globals = {
    env: env,
    mainFileDirectory: string,
    log: typeof log,
};
