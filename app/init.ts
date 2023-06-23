import { readFileSync } from 'fs';
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

{
    // set the serve TZ to UTC
    process.env.TZ = 'UTC';
    
    function dtToStr(dt = new Date()): `${string}:${string}:${string}:${string}`
    {
        const h = String(dt.getHours()).padStart(2, '0');
        const m = String(dt.getMinutes()).padStart(2, '0');
        const s = String(dt.getSeconds()).padStart(2, '0');
        const ms = String(dt.getMilliseconds()).padStart(3, '0');

        return `[${h}:${m}:${s}:${ms}]:`;
    }

    function getCallerLine(): string | null
    {
        const errStack = new Error().stack?.split('\n') || [];
        let errIdx = errStack.findIndex(line => line === 'Error');
        if (errIdx > -1)
            errIdx += 3;
        else if (!errStack.length)
            return null;

        try
        {
            const callerLine = errStack[errIdx] as string;
            const [file, line, col] = callerLine.split(/[(|)]/)[1]!.split(':');
            
            return `[${cyan}${file}:${magenta}${line}:${col}${reset}]:`;
        }
        catch(err)
        {
            console.log(err);
            console.log(errStack);
            console.log('Could not get caller line');

            return null;
        }
    }

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
    // const green = '\x1b[32m';
    const reset = '\x1b[0m';

    const globals: Globals = {
        env: { ...o, isDev, bot },
        mainFileDirectory: mainDir,
        log: isDev ? console.log : (...args: any[]) => {
            console.log(dtToStr(), ...args);
        },
        logErr: (err: any) => {
            const caller = getCallerLine();

            if (!env.isDev) console.log(dtToStr());
            if (caller) console.log(caller);

            console.error(err);
        },
        logLine: (...args: any[]) => {
            const caller = getCallerLine();
            if (caller) console.log(caller);

            console.log(...args);
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

        if (err instanceof Error) cleanStack(err);
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