type ENV = {
    env: 'dev' | 'prod';
    bots: {
        name: string;
        username: string;
        token: string;
        env: 'dev' | 'prod';
    }[];
    users: {
        username: string;
        id: string;
        startMsg: string;
    }[];
    chats: {
        id: number;
        startMsg: string;
        type: string;
    }[];
}

declare const env: ENV & { isDev: boolean, bot: ENV['bots'][0] };
declare const mainFileDirectory: string;
declare function log(...message: any[]): void

type Globals = {
    env: env,
    mainFileDirectory: string,
    log: typeof log,
};
