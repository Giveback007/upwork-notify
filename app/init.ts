import { readFileSync } from 'fs';
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

{
    const mainDir = dirname(fileURLToPath(import.meta.url));
    const keyFile = join(mainDir, '.key');
    const key = readFileSync(keyFile, 'utf-8');
    if (!key) throw new Error(`.key file is missing`);

    const o = JSON.parse(key);
    const tuple: TupleKeys<ENV> = ["env", "bots", "users", "chats"];

    tuple.forEach(key => {
        if (!o[key]) throw new Error(`.key file is missing ${key}`);
    });

    const globals: Globals = {
        env: { ...o, isDev: o.env === 'dev' },
        mainFileDirectory: mainDir,
        log: (...args: any[]) => {
            const stackLines = new Error().stack!.split('\n');
            const callerLine = stackLines[2] as string;
            const callerLineParts = callerLine.split('(')[1]!.replace(')', '').split(':');
            const callerFile = callerLineParts.slice(0, -2).join(':');
            const callerLineNum = callerLineParts[callerLineParts.length - 2];
            const callerCharNum = callerLineParts[callerLineParts.length - 1];
            
            // colors
            const cyan = '\x1b[36m';
            const magenta = '\x1b[35m';
            const green = '\x1b[32m';
            const reset = '\x1b[0m';
        
            console.log(`[${cyan}${callerFile}:${magenta}${callerLineNum}:${callerCharNum}${reset}]:`);
            console.log(green, ...args, reset);
        }
    }

    Object.assign(globalThis, globals);
}
