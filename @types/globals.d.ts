type User = {
    username: string;
    roles: Partial<{
        dev: boolean;
    }>;
}

type BotUser = {
    name: string;
    username: string;
    token: string;
    env: 'dev' | 'prod';
}

type ENV = {
    env: 'dev' | 'prod';
    bots: BotUser[];
    users: [string, User][];
    chats: [string, Chat][];
}

declare const env: ENV & { isDev: boolean, bot: ENV['bots'][0] };
declare const mainFileDirectory: string;
declare function log(...message: any[]): void
declare function logLine(...message: any[]): void
declare function cleanStack(error?: Error): string;
declare function joinMain(filePath: string): string;

type Globals = {
    env: typeof env,
    mainFileDirectory: typeof mainFileDirectory;
    logLine: typeof logLine;
    log: typeof log;
    cleanStack: typeof cleanStack;
    joinMain: typeof joinMain;
};
