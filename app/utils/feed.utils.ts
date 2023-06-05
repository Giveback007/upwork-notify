import fetch from "node-fetch";
import * as xml2js from 'xml2js';
import { Bot } from "../bot";
import { writeJSON } from "./utils";

export async function getFeed(link: string, num: 10 | 20 | 50 | 100 = 20) {
    link = urlParamsFix(link, {
        sort: 'recency',
        paging: `0;${num}`,
    });

    //! if xml is cached, use it (for testing purposes)
    // const cachedXML = await readJSON<string>('../data/feed.xml');
    // if (cachedXML) return await xmlToJSON(cachedXML);

    try {
        const response = await fetch(link);
        const xml = await response.text();
        // cache the xml
        writeJSON('../data/feed.xml', xml);
        return await xmlToJSON(xml);
    } catch (error) {
        Bot.sendError(error);
        return null;
    }
}

export function urlParamsFix(link: string, addParams: { [key: string]: string } = {}) {
    const url = new URL(link);
    Object.entries(addParams).forEach(([key, value]) =>
    url.searchParams.set(key, value));

    return url.toString();
}

async function xmlToJSON(xml: string) {
    const parser = new xml2js.Parser();
    const { feed: json } = await parser.parseStringPromise(xml);

    json.rssUrl = json.id[0];
    json.items = json.entry;

    // Array of keys to delete
    [
        'title', 'link', 'id', '$', 'entry',
        'subtitle', 'rights', 'logo', 'generator',
        'author'
    ].forEach(key => delete json[key]);

    json.items = json.items.map((x: any) => {
        const item = {
            id: x.id[0],
            title: x.title[0]._.replace(/ - Upwork$/, ''),
            updated: x.updated[0],
            linkHref: x.link[0].$.href,
        } as FeedItem;

        const uncleanContent = x.content[0]._;
        const { main, record } = parseContent(uncleanContent);
        item.content = main;
        
        return { ...item, ...record };
    });
    
    // when you want to test with only one item
    // json.items = [json.items[0]];

    Object.keys(json).forEach(key =>
        key !== 'items' && Array.isArray(json[key]) && (json[key] = json[key][0]));

    return json as Feed;
}

const cleanUpContent = (input: string) => input
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/click to apply\s*$/, '')
    .replace(/(\n{2,})/g, (match) => '\n'.repeat(match.length - 1))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();

function parseContent(content: string) {
    const record = {} as FeedItemExtras;
    const lastTripleBreakIndex = content.lastIndexOf('<br /><br /><br />');
    
    // Separate the main content from the rest
    const mainContent = content.substring(0, lastTripleBreakIndex).trim();
    const remainingContent = content.substring(lastTripleBreakIndex + 15).trim();

    // Split the remaining content into key-value pairs
    const pairs = remainingContent.split('<br />');

    pairs.forEach((pair) => {
        let [key = '', val = ''] = pair.split(/:(.+)/);
        if (!key.includes('<b>')) return;

        // get the key between the <b> tags
        key = key.substring(key.indexOf('<b>') + 3, key.indexOf('</b>'));
        (record as any)[key] = cleanUpContent(val.replace(/\s{2,}/g, ' '));
    });

    //! TODO: fix this
    // if (!cleanUpContent(mainContent)) {
    //     log({
    //         content,
    //         mainContent,
    //         cleanContent: cleanUpContent(mainContent),
    //     })
    // }
    return { main: cleanUpContent(mainContent), record };
}