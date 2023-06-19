import { readFileSync } from 'fs';
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

function dtToStr(dt = new Date()): `${string}:${string}:${string}:${string}`
{
    const h = String(dt.getHours()).padStart(2, '0');
    const m = String(dt.getMinutes()).padStart(2, '0');
    const s = String(dt.getSeconds()).padStart(2, '0');
    const ms = String(dt.getMilliseconds()).padStart(3, '0');

    return `[${h}:${m}:${s}:${ms}]:`;
}

{
    const mainDir = dirname(fileURLToPath(import.meta.url));
    const keyFile = join(mainDir, '../.key');
    const key = readFileSync(keyFile, 'utf-8');
    if (!key) throw new Error(`.key file is missing`);

    const o = JSON.parse(key);
    const keyObj: { [key in keyof ENV]: '' } = { env: '', bots: '', users: '' };

    Object.keys(keyObj).forEach(key => {
        if (!o[key]) throw new Error(`.key file is missing "${key}"`);
    });

    const isDev = o.env === 'dev';
    const bot = o.bots.find((bot: any) => bot.env === o.env);
    if (!bot) throw new Error(`.key file is missing bot for ${o.env}`);

    const joinMain = (filePath: string) => join(mainDir, filePath);

    const root = joinMain('../..');

    // colors
    const cyan = '\x1b[36m';
    const magenta = '\x1b[35m';
    const green = '\x1b[32m';
    const reset = '\x1b[0m';

    const globals: Globals = {
        env: { ...o, isDev, bot },
        mainFileDirectory: mainDir,
        log: (...args: any[]) => {
            const t = !env.isDev ? dtToStr() : '';
            console.log(t, ...args);
        },
        logErr: (...args: any[]) => {
            const stackLines = new Error().stack!.split('\n');
            const callerLine = stackLines[2] as string;
            const callerLineParts = callerLine.split('(')[1]!.replace(')', '').split(':');
            const callerFile = callerLineParts.slice(0, -2).join(':');//.replace(root, '');
            const callerLineNum = callerLineParts[callerLineParts.length - 2];
            const callerCharNum = callerLineParts[callerLineParts.length - 1];

            if (!env.isDev) log(dtToStr());
            console.log(`[${cyan}${callerFile}:${magenta}${callerLineNum}:${callerCharNum}${reset}]:`);
            console.error(...args);
        },
        logLine: (...args: any[]) => {
            const stackLines = new Error().stack!.split('\n');
            const callerLine = stackLines[2] as string;
            const callerLineParts = callerLine.split('(')[1]!.replace(')', '').split(':');
            const callerFile = callerLineParts.slice(0, -2).join(':');//.replace(root, '');
            const callerLineNum = callerLineParts[callerLineParts.length - 2];
            const callerCharNum = callerLineParts[callerLineParts.length - 1];
        
            console.log(`[${cyan}${callerFile}:${magenta}${callerLineNum}:${callerCharNum}${reset}]:`);
            console.log(green, ...args, reset);
        },
        cleanStack: (error = new Error()) => {
            if (!(error instanceof Error)) error = new Error(error);
            const { stack } = error;
            if (!stack) return 'No stack trace found.';
        
            let lines = stack.split('\n');

            lines = lines.filter(line => line.includes(root) && !line.includes('/node_modules/'));
            return lines.join('\n');
        },
        joinMain
    }

    Object.assign(globalThis, globals);

    // @ts-ignore
    process.on('uncaughtException', (err) => {
        console.error('An uncaughtException was found, the program will end.');
        console.error(err.stack);

        log(cleanStack(err));
        if (env.isDev) debugger;

        process.exit(1);
    });

    // @ts-ignore
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);

        if (reason instanceof Error) cleanStack(reason);
        if (env.isDev) debugger;

        process.exit(1);
    });
}
