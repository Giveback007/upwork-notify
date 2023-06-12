import path from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv';

{
    const tuple: TupleKeys<ENV> = ["isDev", "ENV", "CHAT_ID", "TELEGRAM_BOT_TOKEN", "BOT_USERNAME", "BOT_NAME", "START_MSG"];
    const o = dotenv.config().parsed;
    if (!o) throw new Error('No .env file found');

    const env: ENV = {} as any;
    env.isDev = (o as any).ENV === 'dev';

    // @ts-ignore
    env.CHAT_ID = env.isDev ? o.BOT_DEV_ID : o.TELEGRAM_GROUP_ID;
    if (!env.CHAT_ID) throw new Error(`.env CHAT_ID error`);

    tuple.forEach(key => {
        if (key === 'CHAT_ID' || key === 'isDev') return;

        const value = o[key];
        if (!value) throw new Error(`.env file is missing ${key}`);
        return env[key] = value;
    });

    const globals = {
        env,
        mainFileDirectory: path.dirname(fileURLToPath(import.meta.url)),
        log: console.log.bind(console),
        traceLog: (...args: any[]) => {
            const err = new Error();
            const stackLine = err.stack?.split('\n')[2]; // 0 is the Error line, 1 is inside this function, 2 is the caller
            const matchResult = stackLine?.match(/\((.*)\)/);
            const location = matchResult ? matchResult[1] : 'unknown location';
            console.log(location);
            console.log(...args);
        }
    }

    Object.assign(globalThis, globals);
}





const x = {
    "ENV": "dev",
    "bots": [
        {
            "name": "JJ-TEST",
            "username": "@jj-test",
            "token": "5751619120:AAHcwCRtcHb9Q7NY_nqTlAsCsQ3kh1B34vU"
        }, {
            "name": "JJ-Tarsero",
            "username": "@jj-tarsero",
            "token": "6258221121:AAEPR2F1n4O0CW16_jN5n89fK6wJuBxeJb0"
        }
    ],
    "authorized": {
        "users": [
            {
                "username": "@danamanam",
                "id": "6228778098",
                "startMsg": "Hello Dovy, I'm ready to fetch those jobs for you!"
            }, {
                "username": "@Casagrande456",
                "id": "6127461181",
                "startMsg": "Hello Karen, I'm ready to fetch those jobs for you!"
            }
        ],
        "groups": [
            {
                "id": -1001984850887,
                "startMsg": "Hello Karen, Wake up!! Breath - God - Magic - WORK"
            }
        ]
    }
}