/**
 * The purpose of this app:
 * 1. Take a link of Upwork rss/atom feed
 * 2. Parse the feed into JSON
 * 3. ...?
 * 
 * END GOAL:
 * Send an update via whatsapp when a new job is posted
 */

import './init.js';

// -- Imports -- //
import * as fs from 'fs';
import * as path from 'path';
import fetch from "node-fetch";
import { ageOfPost, urlParamsFix, xmlToJSON } from "./utils.js";

// -- Constants -- //
const atomLink = env.UPWORK_LINK;
const feedJson = path.join(mainFileDirectory, '../data/feed.json');
const feedXml = path.join(mainFileDirectory, '../data/feed.xml');

// -- App Start -- //
setTimeout(async () => {
    const link = urlParamsFix(atomLink, {
        sort: 'recency',
        paging: '0;20',
        // paging: '0;100', // MAX
    });

    let xml: string

    if (!fs.existsSync(feedXml)) {
        const response = await fetch(link);
        xml = await response.text();
        
        fs.writeFileSync(feedXml, xml);
    } else {
        xml = fs.readFileSync(feedXml, 'utf8');
    }

    const json = await xmlToJSON(xml);
    // [json.items.at(-1)]
    json.items.forEach((item) => {
        log('\n\n\n')
        log(`${ageOfPost(item).string} -- ${item.title}` + '\n\n', item.content);
        log(item.extras);
        
    });

    log('length', json.items.length)
    fs.writeFileSync(feedJson, JSON.stringify(json, null, 2));
});
