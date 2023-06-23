import fs from 'fs';
import path from 'path';
import { ZodSchema, z } from 'zod';
import { time } from './time.utils';

export const genFeed =
({
    lastChecked,
    checkFreq,
    feedItemPullCount,
    maxJobUpdateAge,
    ...rest 
}: FeedParams): Feed =>
({
    lastChecked: lastChecked ?? 0,
    checkFreq: checkFreq ?? time.min(20),
    feedItemPullCount: feedItemPullCount ?? 20,
    maxJobUpdateAge: maxJobUpdateAge ?? time.hrs(3),
    ...rest,
});

export const genChat =
({
    active,
    dayEnd,
    dayStart,
    dayStartMsg,
    dayEndMsg,
    feedIds,
    timeZone,
    idsOfSentFeedItems,
    lastDayStartEndMsg,
    ...rest
}: ChatParams): Chat =>
({
    active: active ?? false,
    dayEnd: dayEnd ?? [20, 30],
    dayStart: dayStart ?? [8, 0],
    dayStartMsg: dayStartMsg ?? null,
    dayEndMsg: dayEndMsg ?? null,
    feedIds: feedIds ?? [],
    idsOfSentFeedItems: idsOfSentFeedItems ?? [],
    timeZone: timeZone ?? new Intl.DateTimeFormat().resolvedOptions().timeZone,
    lastDayStartEndMsg: lastDayStartEndMsg ?? { start: 0, end: 0 },
    ...rest,
});

export const handleZod = <T extends ZodSchema>(zSchema: T, data: any) =>
{
    try
    {
        return {
            type: 'SUCCESS' as const,
            data: zSchema.parse(data) as ReturnType<T['parse']>,
        }
    } 
    catch (error)
    {
        if (error instanceof z.ZodError)
        {
            console.error('Validation failed');
            console.error(error.errors);
            return { type: 'ZOD_ERROR' as const, error };
        } 
        else
        {
            return {
                type: 'ERROR' as const,
                error: error instanceof Error ? error : new Error(error)
            };
        }
    }
}

export const writeFile = (pth: string, data: string) =>
{
    const pathToFile = joinMain(pth);
    // Create directory if it doesn't exist
    fs.mkdirSync(path.dirname(pathToFile), { recursive: true });

    // Write file
    fs.writeFileSync(pathToFile, data);
}

export const readFile = (path: string) =>
{
    if (!fs.existsSync(joinMain(path))) return null;
    return fs.readFileSync(joinMain(path), 'utf8');
}

export const readJSON = <T>(path: string): T | null =>
{
    const result = readFile(path) || null as any;
    return JSON.parse(result);
};

export const writeJSON = (path: string, json: any) =>
{
    writeFile(path, JSON.stringify(json, null, 2));
}

export function arrToRecord<
    T extends AnyObj
>(arr: T[], idKey: keyof T)
{
        const rec: Record<string, T> = { };
        arr.forEach((obj) => rec[obj[idKey]] = obj);
    
        return rec;
}

export function idsToRecord(arr: string[])
{
    const rec: Record<string, true> = { };
    arr.forEach((id) => rec[id] = true);

    return rec;
}

export const arrLast = <T>(arr: T[]) => arr[arr.length - 1];

export const objKeyCheck = <T extends AnyObj>(obj: T, keysObj: { [key in keyof T]: any }) =>
{
    const missingKeys: string[] = [];
    const keys = [];
    for (const key in keysObj)
    {
        if (obj[key] === undefined) missingKeys.push(key);
        else keys.push(key);
    }

    return missingKeys.length ?
        { ok: false, missingKeys } as const
        :
        { ok: true, val: obj, keys: keys as TupleKeys<T> } as const;
}
