/**
 * !TODO:
 * - Ensure msg was delivered before storing the corresponding feed item
 * - Allow to filter out jobs by country
 * - Analytics for each feed (hour by hour n of post by day of week)
 * - Validate is user is allowed to use the bot
 * - Proper multi user support (+ no more than 30msg per sec for all users)
 */

// -- Init -- //
import './init';

// -- Imports -- //
import { feeds as feedsState, feedParams, bot, feedItems, jobMsgs } from './store';
import { getFeed } from './utils/feed.utils';
import { arrToRecord, getTime, msToTime, storeFeedItems, time } from './utils/utils';
import { generateMessage } from './utils/msg.utils';

// -- App Start -- //
setTimeout(async () => {
    try {
        bot.start();
        log('[1]: BOT STARTED');

        checkFeeds();
        log('[2]: FEED CHECKER STARTED');

        updateMsgs();
        log('[3]: MSG TIMES-UPDATER STARTED');

        // async import the commands
        await import('./bot/commands.bot');
        log('[4]: COMMANDS INITIALIZED');

        bot.send({ msg: '💻' });
        bot.send({ msg: env.START_MSG });
        log('[Final]: APP INITIALIZED');
    } catch(error) {
        bot.sendError(error);
        log('APP ERROR');
    }
});

// -- Functions -- //
const jobIsTooOld = (job: FeedItem, noOlderThan: number) => getTime(job.updated) < (Date.now() - noOlderThan);

async function checkFeeds(): Promise<any> {
    const { feedItemCount, defCheckFreq } = feedParams.get();
    const feeds = Object.entries(feedsState.get());
    const now = Date.now();

    const proms = feeds.map(async ([hashId, feed]) => {
        const freq = feed.checkFreq || defCheckFreq;
        if (feed.lastChecked + freq > now) return;
        
        try {
            const url = feed.rssUrl;
            const items = await getFeed(url, feedItemCount);
            if (!items) throw new Error(`Error fetching feed: ${hashId}`);

            feedUpdatesHandler(hashId, { ...feed, items, lastChecked: now });
        } catch (error) {
            log(error);

            bot.send({ msg: `Error fetching feed: "${feed.name}"` });
            feedsState.update({ [hashId]: { ...feed, lastChecked: now } });
        }
    });
    
    log(`Checking ${feeds.length} feed(s)`)
    Promise.allSettled(proms).then(() =>
        setTimeout(checkFeeds, time.min(1)));
    log(`Next check in 1 min`);
}

function feedUpdatesHandler(hashId: string, newFeed: Feed) {
    // store the feed items to json for later analytics
    storeFeedItems(newFeed);

    const feeds = feedsState.get();
    const freq = newFeed.checkFreq || feedParams.get().defCheckFreq;
    
    const oldItems = (feeds[hashId]?.items || []).filter(x => !jobIsTooOld(x, freq * 2));
    const itemsRec = arrToRecord(oldItems, 'linkHref');

    const newItems = newFeed.items
        .filter(job => !jobIsTooOld(job, freq * 2) && !itemsRec[job.linkHref])
        .sort((a, b) => getTime(a.updated) - getTime(b.updated));

    newItems.forEach(job => itemsRec[job.linkHref] = job);
    const items = Object.values(itemsRec);

    if (!newItems.length) {
        feedsState.update({ [hashId]: { ...newFeed, items } });
        return;
    }

    const { h, m } = msToTime(freq);
    bot.send({ msg: '📨' });
    bot.send({ msg: `[📶]: ${newFeed.name}\n[📬]: ${newItems.length}\n[⏰]: ${h}h ${m}m]`})
    newItems.forEach(job =>
        bot.send({ msg: generateMessage(job), type: 'job', feedItemId: job.linkHref }));

    feedsState.update({ [hashId]: { ...newFeed, items } });
}

// @ts-ignore
(process as any).on('uncaughtException', (err) => {
    console.error('An uncaughtException was found, the program will end.');
    console.error(err.stack);
    process.exit(1);
});

// @ts-ignore
(process as any).on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

export function updateMsgs()
{
    log('Updating messages...');
    const now = Date.now();
    const map = feedItems.get();
    const { maxJobAge } = feedParams.get();

    // stop updating messages older than maxJobAge hours
    const msgs = Object.entries(jobMsgs.get())
        .filter(([, { msgId, chatId, feedItemId, date }]) => {
            if (now - date * 1000 > maxJobAge) return false;

            const item = map.get(feedItemId);
            if (!item) {
                console.log(`FeedItem not found: ${feedItemId}`);
                return false;
            };

            const updateMsg = generateMessage(item);
            bot.update({ updateMsg, msgId, chatId });
            return true;
    });

    jobMsgs.set(Object.fromEntries(msgs));
    setTimeout(updateMsgs, time.min(1.5));
}
