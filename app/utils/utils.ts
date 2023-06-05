import * as fs from 'fs';
import * as path from 'path';

export const time = {
    sec: (s: number) => s * 1000,
    min: (m: number) => m * 60000,
    hrs: (h: number) => h * 3600000,
}

export function ageOfPost(item: FeedItem) {
        const now = new Date().getTime();
        const date = new Date(item.updated).getTime();
        const ageMs = now - date;
    
        const ageS = ageMs / 1000;
        const ageM = ageS / 60;
        const h = Math.floor(ageM / 60);
        const m = Math.floor(ageM % 60);
    
        return { h, m, string: `${h}h ${m}m` };
}

export const wait = (ms: number) =>
    new Promise(r => setTimeout(r, ms));

export const joinMain = (filePath: string) =>
    path.join(mainFileDirectory, filePath);

export const writeFile = (path: string, data: string) =>
    fs.writeFileSync(joinMain(path), data);

export const readFile = (path: string) =>
{
    if (!fs.existsSync(joinMain(path))) return null;
    return fs.readFileSync(joinMain(path), 'utf8');
}

export const readJSON = <T>(path: string): T | null =>
    JSON.parse(readFile(path) || null as any);

export const writeJSON = (path: string, json: any) =>
    writeFile(path, JSON.stringify(json, null, 2));

export function arrToRecord<
    T extends AnyObj
>(arr: T[], idKey: keyof T)
{
        const rec: Record<string, T> = { };
        arr.forEach((obj) => rec[obj[idKey]] = obj);
    
        return rec;
}

export const uuid = () =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });

export function msToTime(msT: number) {
    const ms = (msT % 1000);
    let s = Math.floor(msT / 1000);
    let m = Math.floor(s / 60);
    s = s % 60;

    let h = Math.floor(m / 60);
    m = m % 60;

    const d = Math.floor(h / 24);
    h = h % 24;

    return { d, h, m, s, ms };
}

/** An extended `typeof` */
export function type(val: any): JsType
{
    if (val === null) return 'null';
    if (Array.isArray(val)) return 'array';
    if (val !== val) return 'NaN';
    if (val instanceof Date) return 'date';
    return typeof val;
}

/**
 * The function will test if the type of the first
 * argument equals testType. Argument testType is a string
 * representing a javascript type.
 *
 * @param val value to be tested
 * @param testType to check if typeof val === testType
 * @example
 * ```js
 * isType([], 'array') //=> true
 * isType(null, 'undefined') //=> false
 * ```
 */
export const isType = <T extends JsType> (
    val: any, testType: T
): val is JsTypeFind<T> => type(val) === testType;

type JsType =
    | 'array'
    | 'bigint'
    | 'boolean'
    | 'function'
    | 'NaN'
    | 'null'
    | 'number'
    | 'object'
    | 'string'
    | 'symbol'
    | 'undefined'
    | 'date'
    | 'never';

type JsTypeFind<S extends JsType> =
    S extends 'array'       ? any[] :
    S extends 'bigint'      ? bigint :
    S extends 'boolean'     ? boolean :
    S extends 'function'    ? Function :
    S extends 'NaN'         ? typeof NaN :
    S extends 'null'        ? null :
    S extends 'number'      ? number :
    S extends 'object'      ? object :
    S extends 'string'      ? string :
    S extends 'symbol'      ? symbol :
    S extends 'undefined'   ? undefined :
    S extends 'date'        ? Date : never;
