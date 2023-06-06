/**
 * !TODO:
 * - Ensure msg was delivered via msgId
 * - Allow to filter out jobs by country
 * - Handle updated jobs
 */

// -- Init -- //
import './init';

// -- Imports -- //
import { Bot } from './bot';
import { atomURL, timeParams } from './store';
import { getFeed } from './utils/feed.utils';
import { arrToRecord, readJSON, time, writeJSON } from './utils/utils';
import { generateMessage } from './utils/msg.utils';

// -- App Start -- //
setTimeout(async () => {
    Bot.start();
    intervalCheckForJobs();

    Bot.send({msgs: '💻'});
    Bot.send({msgs: env.START_MSG});
    log('APP STARTED');
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

    const updatedItems = feed.items.filter(x =>
        oldItemsObj[x.id] && oldItemsObj[x.id]?.updated !== x.updated)
        .sort((a, b) => new Date(a.updated).getTime() - new Date(b.updated).getTime());

    const newItems = feed.items
        .filter(x => !oldItemsObj[x.id] && !jobIsTooOld(x))
        .sort((a, b) => new Date(a.updated).getTime() - new Date(b.updated).getTime());

    const mdMsgs: string[] = [];

    // Send messages for updated items
    for (const item of updatedItems) {
        mdMsgs.push(generateMessage(item));
    }

    // Send messages for new items
    for (const item of newItems) {
        mdMsgs.push(generateMessage(item));
    }

    const itemsRec = arrToRecord([ ...oldItems, ...updatedItems, ...newItems], 'id');
    const items = Object.values(itemsRec);

    if (updatedItems.length || newItems.length) {
        let msg = '';
        if (newItems.length > 0)
            msg += `📬 New: ${newItems.length} || `;
        
        if (updatedItems.length > 0)
            msg += `🔁 Updated: ${updatedItems.length} 🔄 || `;
    
        msg = `[${msg}past ${(params.freq / time.min(1)).toFixed(0)} mins ⏰]`;
    
        Bot.send({ msgs: '📬' });
        Bot.send({ msgs: msg });
        Bot.send({ msgs: mdMsgs });
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
