import { readFileSync } from 'fs';
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

{
    const mainDir = dirname(fileURLToPath(import.meta.url));
    const keyFile = join(mainDir, '../.key');
    const key = readFileSync(keyFile, 'utf-8');
    if (!key) throw new Error(`.key file is missing`);

    const o = JSON.parse(key);
    const keyObj: { [key in keyof ENV]: '' } = {
        env: '', bots: '', users: '', chats: ''
    };

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
        log: console.log.bind(console),
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
            const idx = lines.findIndex(line => line.includes('at cleanStack'));
            if (idx !== -1) lines[idx] = root;

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
        process.exit(1);
    });

    // @ts-ignore
    process.on('unhandledRejection', (reason, promise) => {
        console.error('Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
}
