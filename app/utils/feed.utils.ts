import fetch from "node-fetch";
import * as xml2js from 'xml2js';
import { handleZod, readJSON, writeJSON } from "./utils";
import { hashString, replaceHtmlEntities, splitAt } from "./string.utils";
import { atomFeedToJSONSchema } from "../schemas/atom-to-json.schema";
import { feedItemSchema } from "../schemas/feed-item.schema";
import { isType } from "./test.utils";
import { bot, feeds } from "../store";

export const genFeed = ({ items, lastChecked, checkFreq, ...rest }: FeedParams): Feed => ({
    items: items ?? [],
    lastChecked: 0 ?? lastChecked,
    checkFreq: checkFreq ?? null,
    ...rest,
});

// https://www.upwork.com/ab/feed/jobs/atom?q=javascript&user_location_match=1&sort=recency&paging=0%3B10&api_params=1&securityToken=b8e9762da3383da88fdab543aaf25418ab321582509f154a4c322e49a5bc293e95645f9f157483f64618af05227ddb546a700cc96a3dae3177e3066c0c67d612&userUid=1057152582708793344&orgUid=1057152582717181953
export async function getFeed(atomUrl: string, num: FeedCheckParams['feedItemCount'] = 20) {
    const xmlPath = `../data/xml/feed.${hashString(atomUrl, 'md5')}.xml`;
    atomUrl = urlParamsFix(atomUrl, {
        sort: 'recency',
        paging: `0;${num}`,
        // paging: `0;100`,
    });

    //! if xml is cached, use it (for testing purposes)
    if (env.isDev) {
        log('DEV MODE: Using cached xml')
        const cachedXML = readJSON<string>(xmlPath);
        if (cachedXML) return await xmlToJSON(cachedXML);
    }

    try {
        const response = await fetch(atomUrl);
        const xml = await response.text();
        if (env.isDev)
            writeJSON(xmlPath, xml);
        
        const json = await xmlToJSON(xml);
        if (!json) bot.send({ msg: 'Failed to parse get feed from link' });
        
        return json;
    } catch (error) {
        bot.sendError(error);
        return null;
    }
}

export function urlParamsFix(link: string, addParams: { [key: string]: string } = {}) {
    const url = new URL(link);
    
    Object.entries(addParams).forEach(([key, value]) =>
    url.searchParams.set(key, value));

    return url.toString();
}

export async function xmlToJSON(xml: string) {
    const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true,
        trim: true,
        ignoreAttrs: true,
    });

    const { feed: json } = await parser.parseStringPromise(xml);
    if (!isType(json.entry, 'array')) json.entry = [json.entry];
    
    const vldJson = handleZod(atomFeedToJSONSchema, json);
    if (vldJson.type === 'ERROR' || vldJson.type === 'ZOD_ERROR') return null;

    const items: FeedItem[] = [];
    vldJson.data.entry.forEach((x) => {
        const { content, extras } = parseContent(x.content);

        const item = {
            title: x.title.replace(/ - Upwork$/, ''),
            updated: x.updated,
            linkHref: x.id,
            content,
            ...extras,
        };

        const zOut = handleZod(feedItemSchema, item);
        if (zOut.type === 'ERROR' || zOut.type === 'ZOD_ERROR') {
            bot.sendError(new Error('FeedItem validation failed'))
            log(zOut.error);
            return;
        }

        items.push(zOut.data);
    });

    return items;
}

export function cleanUpContent(input: string) {
    const str = input
        .replace(/<br\s*\/?>/g, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/click to apply\s*$/, '')
        .replace(/(\n{2,})/g, (match) => '\n'.repeat(match.length - 1))
        .trim();

    return replaceHtmlEntities(str);
}

export function parseContent(content: string) {
    const extras = {} as FeedItemExtras;
    const breakIdx = content.lastIndexOf('<br /><br /><b>');
    
    // Separate the main content from the rest
    const [mainContent = '', remainingContent = ''] = splitAt(content, breakIdx);
    if (!mainContent || !remainingContent) bot.sendError(new Error('mainContent or remainingContent is null'));

    const pairs = remainingContent.split('<br />');

    pairs.forEach((pair) => {
        let [key = '', val = ''] = pair.split(/:(.+)/);
        if (!key.includes('<b>')) return;

        // get the key between the <b> tags
        key = key.substring(key.indexOf('<b>') + 3, key.indexOf('</b>'));
        extras[key as keyof FeedItemExtras] = cleanUpContent(val.replace(/\s{2,}/g, ' '));
    });
    
    return { content: cleanUpContent(mainContent), extras };
}

type FeedFilters = { userId?: string, chatId?: string };
export function filterFeeds(filters: FeedFilters): Feed[];
export function filterFeeds(filters: FeedFilters, getIds: false): Feed[];
export function filterFeeds(filters: FeedFilters, getIds: true): string[];
export function filterFeeds(filters: FeedFilters, getIds: boolean = false): Feed[] | string[] {
    const feedArr = Object.entries(feeds.get());
    const { userId, chatId } = filters;
    
    const filteredFeeds = feedArr.filter(([,fd]) => {
        if (userId && fd.userId !== userId) return false;
        if (chatId && fd.chatId !== chatId) return false;
        return true;
    });

    return getIds ?
        filteredFeeds.map(([id]) => id)
        :
        filteredFeeds.map(([,feed]) => feed as any as Feed);
}