import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

export function urlParamsFix(link: string, addParams: { [key: string]: string } = {}) {
    const url = new URL(link);
    Object.entries(addParams).forEach(([key, value]) =>
        url.searchParams.set(key, value));

    // Save to file: to keep track of the url params 
    const urlObject = Object.fromEntries(url.searchParams);
    const filePath = path.join(mainFileDirectory, '../data/url-params.json');
    fs.writeFileSync(filePath, JSON.stringify(urlObject, null, 2));


    return url.toString();
}

export async function xmlToJSON(xml: string) {
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
            content: cleanUpContent(x.content[0]._),
        } as FeedItem;

        // item.age = ageOfPost(item);
        return item;
    });
    
    // when you want to test with only one item
    // json.items = [json.items[0]];

    Object.keys(json).forEach(key =>
        key !== 'items' && Array.isArray(json[key]) && (json[key] = json[key][0]));

    return json as Feed;
}

export function ageOfPost(item: FeedItem) {
        const now = new Date().getTime();
        const date = new Date(item.updated).getTime();
        const ageMillis = now - date;
    
        const ageSeconds = ageMillis / 1000;
        const ageMinutes = ageSeconds / 60;
        const h = Math.floor(ageMinutes / 60);
        const m = Math.floor(ageMinutes % 60);
    
        return { h, m, string: `${h}h ${m}m` };
}

export const cleanUpContent = (input: string) => input
    .replace(/<[^>]*>/g, '')
    .replace(/click to apply\s*$/, '')
    .trim();

// .replace(/&amp;/g, '&')
// .replace(/&lt;/g, '<')
// .replace(/&gt;/g, '>')
// .replace(/&quot;/g, '"')
// .replace(/&#039;/g, "'")