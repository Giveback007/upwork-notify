import fetch from "node-fetch";
import * as xml2js from 'xml2js';
import { handleZod, idsToRecord, readJSON, writeJSON } from "./utils/utils";
import { cleanUpContent, hashString, splitAt } from "./utils/string.utils";
import { atomFeedToJSONSchema } from "./schemas/atom-to-json.schema";
import { feedItemSchema } from "./schemas/feed-item.schema";
import { isType } from "./utils/test.utils";
import { feedItems, feeds } from "./store/store";
import { getTime } from "./utils/time.utils";

export function storeFeedItems(feedId: string, newFeedItems: FeedItem[])
{
    const filePath = `../data/feeds/${feedId}.json`;

    const oldItems = readJSON<Record<string, FeedItem>>(filePath) || {};
    newFeedItems.forEach((item) => {
        oldItems[item.linkHref] = item;
        feedItems.set(item.linkHref, item);
    });

    writeJSON(filePath, oldItems);
}

// https://www.upwork.com/ab/feed/jobs/atom?q=javascript&user_location_match=1&sort=recency&paging=0%3B10&api_params=1&securityToken=b8e9762da3383da88fdab543aaf25418ab321582509f154a4c322e49a5bc293e95645f9f157483f64618af05227ddb546a700cc96a3dae3177e3066c0c67d612&userUid=1057152582708793344&orgUid=1057152582717181953
export async function getFeed(atomUrl: string, num: Feed['feedItemPullCount'] = 20)
{
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
        if (!json) {
            log('Failed to parse get feed from link')
            if (env.isDev) debugger;
        }
        
        return json;
    } catch (error) {
        log(error);
        if (env.isDev) debugger;

        return null;
    }
}

export function urlParamsFix(link: string, addParams: { [key: string]: string } = {})
{
    const url = new URL(link);
    
    Object.entries(addParams).forEach(([key, value]) =>
    url.searchParams.set(key, value));

    return url.toString();
}

export async function xmlToJSON(xml: string)
{
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
            updated: getTime(x.updated),
            linkHref: x.id,
            content,
            ...extras,
        };

        const zOut = handleZod(feedItemSchema, item);
        if (zOut.type === 'ERROR' || zOut.type === 'ZOD_ERROR') {
            if (env.isDev) debugger;
            log(zOut.error);
            return;
        }

        items.push(zOut.data);
    });

    return items;
}

export function parseContent(content: string)
{
    const extras = {} as FeedItemExtras;
    const breakIdx = content.lastIndexOf('<br /><br /><b>');
    
    // Separate the main content from the rest
    const [mainContent = '', remainingContent = ''] = splitAt(content, breakIdx);
    if (env.isDev && (!mainContent || !remainingContent)) debugger; 

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

type FeedFilters = { userId?: string, chatId?: string, feedIds?: string[] };
export function filterFeeds(filters: FeedFilters): [string, Feed][];
export function filterFeeds(filters: FeedFilters, getIds: false): [string, Feed][];
export function filterFeeds(filters: FeedFilters, getIds: true): string[];
export function filterFeeds(filters: FeedFilters, getIds: boolean = false): [string, Feed][] | string[]
{
    const { userId, chatId, feedIds } = filters;
    const filteredFeeds: [string, Required<FeedParams>][] = [];
    const idRec = feedIds ? idsToRecord(feedIds) : null;

    let idx = 0;
    feeds.forEach((feed, id) => {
        if (idRec && !idRec[id]) return;
        if (userId && feed.userId !== userId) return;
        if (chatId && feed.chatId !== chatId) return;

        filteredFeeds[idx] = [id, feed];
        idx++;
    });

    return getIds ?
        filteredFeeds.map(([id]) => id)
        :
        filteredFeeds;
}

type FeedItemFilters = {
    countries?: string[],
    categories?: string[],
    itemIds?: string[],
    /** No older than (item.updated > MaxAge) */
    maxAge?: number | Date,
    /** No younger than (item.updated < MinAge) */
    minAge?: number | Date,
};
export function filterFeedItems(filters: FeedItemFilters)
{
    // check if the keys are set to undefined
    if (env.isDev) Object.keys(filters).forEach((key) => {
        if (Object.hasOwn(filters, key) && !filters[key as keyof FeedItemFilters]) debugger;
    });
    
    const f = (s: string) => s.toLocaleLowerCase().trim();
    const { countries, categories, itemIds, maxAge: dtMax, minAge: dtMin } = filters;
    const maxAge = dtMax && getTime(dtMax);
    const minAge = dtMin && getTime(dtMin);

    const idRec = itemIds ? idsToRecord(itemIds) : null;
    const countryRec = countries ? idsToRecord(countries.map(f)) : null;
    const categoryRec = categories ? idsToRecord(categories.map(f)) : null;

    const filteredFeedItem: [string, FeedItem][] = [];
    feedItems.forEach((item, id) => {
        if (idRec && !idRec[id])                            return;
        if (maxAge && item.updated < maxAge)                return;
        if (minAge && item.updated > minAge)                return;
        if (categoryRec && !categoryRec[f(item.Category)])  return;
        if (countryRec  && !countryRec[f(item.Country)])    return;
    
        filteredFeedItem.push([id, item]);
    });

    return filteredFeedItem;
}
