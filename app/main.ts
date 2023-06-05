/**
 * The purpose of this app:
 * 1. Take a link of Upwork rss/atom feed
 * 2. Parse the feed into JSON
 * 3. ...?
 * 
 * END GOAL:
 * Send an update via telegram when a new job is posted
 */

// -- Init -- //
import './init';

// -- Imports -- //
import { Bot } from './bot';
import { atomURL, timeParams } from './store';
import { getFeed } from './utils/feed.utils';
import { ageOfPost, arrToRecord, readJSON, time, writeJSON } from './utils/utils';

// -- App Start -- //
setTimeout(async () => {
    Bot.start();
    intervalCheckForJobs();

    Bot.send(env.START_MSG);
    log('App Started');
});

// -- Functions -- //
const again = (n = 1000): any => setTimeout(intervalCheckForJobs, n);
const jobIsTooOld = (job: FeedItem) => new Date(job.updated).getTime() < (Date.now() - timeParams.get().jobExpiry);

async function intervalCheckForJobs() {
    const urlObj = atomURL.get();
    if (!urlObj) return again();
    
    const now = Date.now();
    const { lastChecked, url } = urlObj;
    const timeSinceCheck = now - lastChecked;
    const params = timeParams.get();
    
    if (timeSinceCheck < params.freq) return again();
        
    const oldFeed = readJSON<Feed | null>('../data/feed.json');
    const feed = await getFeed(url, oldFeed ? 20 : 100);

    if (!feed) { // If feed is null check again in 2 minutes
        atomURL.set({ url, lastChecked: now - params.freq + time.min(2) });
        return again();
    } else {
        atomURL.set({ url, lastChecked: now });
    }

    // Filter out jobs that are too old
    const oldItems = (oldFeed?.items || []).filter(x => !jobIsTooOld(x));
    const oldItemsObj = arrToRecord(oldFeed?.items || [], 'id');

    // Find items that have been updated
    const updatedItems = feed.items.filter(x =>
        oldItemsObj[x.id] && oldItemsObj[x.id]?.updated !== x.updated);

    // Find items that are new
    const newItems = feed.items.filter(x => !oldItemsObj[x.id] && !jobIsTooOld(x));

    let didSend = false;
    // Send messages for updated items
    for (const item of updatedItems) {
        const { h, m } = ageOfPost(item);
        Bot.send(`[${h}h ${m}m ago]:\nUpdated: ${item.title}\n${item.linkHref}`);
        didSend = true;
    }

    // Send messages for new items
    for (const item of newItems) {
        const { h, m } = ageOfPost(item);
        Bot.send(`[${h}h ${m}m ago]:\nNew: ${item.title}\n${item.linkHref}`);
        didSend = true;
    }

    const itemsRec = arrToRecord([ ...oldItems, ...updatedItems, ...newItems], 'id');
    const items = Object.values(itemsRec);

    if (didSend) {
        const msg = `Total Jobs: ${items.length} in last ${(params.jobExpiry / time.hrs(1)).toFixed(1)} hours`;
        Bot.send(msg);
    }

    writeJSON('../data/feed.json', { ...feed, items });
    return again();
}

// @ts-ignore
process.on('uncaughtException', (err) => {
    console.error('An uncaughtException was found, the program will end.');
    // Ideally you would also log this to an external system here
    console.error(err.stack);
    process.exit(1);
});

// @ts-ignore
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
    // Application specific logging, throwing an error, or other logic here
});
