type ENV = {
    env: 'dev' | 'prod';
    bots: BotUser[];
    users: [string, User][];
}

const env: ENV & { isDev: boolean, bot: ENV['bots'][0] };
const mainFileDirectory: string;
function log(...message: any[]): void
function logErr(...message: any[]): void
function logLine(...message: any[]): void
function cleanStack(error?: Error): string;
function joinMain(filePath: string): string;

type Globals = {
    env: typeof env,
    mainFileDirectory: typeof mainFileDirectory;
    logLine: typeof logLine;
    log: typeof log;
    logErr: typeof logErr;
    cleanStack: typeof cleanStack;
    joinMain: typeof joinMain;
};
