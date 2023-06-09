import * as fs from 'fs';
import * as path from 'path';
import { ZodSchema, z } from 'zod';
import { hashId } from '../store';

export function storeFeedItems(feed: Feed) {
    const hash = hashId(feed.rssUrl);
    const filePath = `../data/feeds/${hash}.json`;

    const items = readJSON<Record<string, FeedItem>>(filePath) || {};
    feed.items.forEach((item) => items[item.linkHref] = item);

    writeJSON(filePath, items);
}

export const handleZod = <T extends ZodSchema>(zSchema: T, data: any) => {
    try {
        return {
            type: 'SUCCESS' as const,
            data: zSchema.parse(data) as ReturnType<T['parse']>,
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Validation failed');
            console.error(error.errors);
            return { type: 'ZOD_ERROR' as const, error };
        } else {
            return {
                type: 'ERROR' as const,
                error: error instanceof Error ? error : new Error(error)
            };
        }
    }
}

export const time = {
    sec: (s: number) => s * 1000,
    min: (m: number) => m * 60000,
    hrs: (h: number) => h * 3600000,
    day: (d: number) => d * 86400000,
}

export const wait = (ms: number) =>
    new Promise(r => setTimeout(r, ms));

export const joinMain = (filePath: string) =>
    path.join(mainFileDirectory, filePath);

export const writeFile = (pth: string, data: string) => {
    const pathToFile = joinMain(pth);
    // Create directory if it doesn't exist
    fs.mkdirSync(path.dirname(pathToFile), { recursive: true });

    // Write file
    fs.writeFileSync(pathToFile, data);
}

export const readFile = (path: string) =>
{
    log('readFile', path);
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
