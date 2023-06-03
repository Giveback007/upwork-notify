import path from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv';

(globalThis as any).env = dotenv.config().parsed;

const globals = {
    mainFileDirectory: path.dirname(fileURLToPath(import.meta.url)),
    log: console.log.bind(console),
}

Object.assign(globalThis, globals);
