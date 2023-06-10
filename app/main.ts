/**
 * !TODO:
 * - (TEST) Handle multiple urls
 * - (TEST) Store json data for each feed to provide stats
 * - (TEST) /url-add
 * - (TEST) /url
 * - (TEST) /url-delete
 * 
 * - Ensure msg was delivered
 * - Allow to filter out jobs by country
 */

// -- Init -- //
import './init';

// -- Imports -- //
import { feeds as feedsState, feedParams, bot, hashId } from './store';
import { getFeed } from './utils/feed.utils';
import { arrToRecord, msToTime, storeFeedItems, time } from './utils/utils';
import { generateMessage } from './utils/msg.utils';
import { updateMsgTimes } from './bot/commands.bot';

// -- App Start -- //
setTimeout(async () => {
    try {
        bot.start();
        log('[1]: BOT STARTED');

        checkFeeds();
        log('[2]: FEED CHECKER STARTED');

        updateMsgTimes();
        log('[3]: MSG TIMES-UPDATER STARTED');

        bot.send({msg: '💻'});
        bot.send({msg: env.START_MSG});
        log('[Final]: APP INITIALIZED');
    } catch(error) {
        bot.sendError(error);
        log('APP ERROR');
    }
});

// -- Functions -- //
const jobIsTooOld = (job: FeedItem) => new Date(job.updated).getTime() < (Date.now() - feedParams.get().jobExpiry);

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

            newFeedHandler({ ...feed, items, lastChecked: now });
        } catch (error) {
            log(error);

            bot.send({ msg: `Error fetching feed: "${feed.name}"` });
            feedsState.update({ [hashId]: { ...feed, lastChecked: now } });
        }
    });
    
    log(`Checking ${feeds.length} feeds`)
    Promise.allSettled(proms).then(() =>
        setTimeout(checkFeeds, time.min(1)));
    log(`Next check in 1 min`);
}

function newFeedHandler(newFeed: Feed) {
    // store the feed items to json for later analytics
    storeFeedItems(newFeed);

    const feedId = hashId(newFeed.rssUrl);
    const feeds = feedsState.get();
    const freq = newFeed.checkFreq || feedParams.get().defCheckFreq;
    
    const oldItems = (feeds[feedId]?.items || []).filter(x => !jobIsTooOld(x));
    const itemsRec = arrToRecord(oldItems, 'linkHref');

    const newItems = oldItems
        .filter(job => !jobIsTooOld(job) && !itemsRec[job.linkHref]);

    newItems.forEach(job => itemsRec[job.linkHref] = job);
    const items = Object.values(itemsRec);

    if (!newItems.length) {
        feedsState.update({ [feedId]: { ...newFeed, items } });
        return;
    }

    const { h, m } = msToTime(freq)
    bot.send({ msg: '📨' });
    bot.send({ msg: `[📶: ${newFeed.name} || 📬: ${newItems.length} || ⏰: ${h}h ${m}m]`})
    newItems.forEach(job =>
        bot.send({ msg: generateMessage(job), type: 'job' }));

    feedsState.update({ [feedId]: { ...newFeed, items } });
}

// @ts-ignore
process.on('uncaughtException', (err) => {
    console.error('An uncaughtException was found, the program will end.');
    console.error(err.stack);
    process.exit(1);
});

// @ts-ignore
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
