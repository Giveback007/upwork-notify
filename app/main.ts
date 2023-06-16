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
import { bot, chats, feeds, jobMsgs, feedItems } from './store/store';
import { writeFile } from './utils/utils';
import { botCmds } from './bot/commands.bot';
import { chatDatStartEndDates, getTime, msToTime, time } from './utils/time.utils';
import { filterFeedItems, filterFeeds, getFeed, storeFeedItems } from './feed';

const params = {
    feedCheckFreq: time.min(1),
    maxJobUpdateAge: time.hrs(3),
}

// -- App Start -- //
setTimeout(async () => {
    try {
        // Write the commands to a file to share with "BotFather"
        writeFile('../bot-commands', Object.entries(botCmds).reduce((acc, [cmd, description]) => {
            acc += `${cmd.slice(1)} - ${description}\n`;
            return acc;
        }, ''));

        bot.start().then(() => log('[*] BOT INITIALIZED'));
        log('[1]: BOT STARTING...');

        checkFeeds();
        log('[2]: FEED CHECKER STARTED');

        updateMsgs();
        log('[3]: MSG TIMES-UPDATER STARTED');

        await import('./bot/commands.bot');
        log('[4]: COMMANDS INITIALIZED');

        const botInfo = await bot.getBotInfo();
        chats.forEach((chat, chatId) => {
            if (!chat.active || env.isDev) return;

            bot.sendMsg(chatId, '💻');
            bot.sendMsg(chatId, `"Server restarted, '${botInfo.first_name}' is back online!"`
                + `\n\n😎 I'm ready to find you some jobs!`);
        });

        log('[Final]: APP INITIALIZED');
    } catch(error) {
        log(error);
        if (env.isDev) debugger;
    }
});

// -- Functions -- //
const jobIsTooOld = (job: FeedItem, noOlderThan: number) =>
    getTime(job.updated) < (Date.now() - noOlderThan);

function checkFeeds()
{
    log(`Checking feeds...`);

    const promises = Array.from(chats.values())
        .map((chat) => chat.active ? filterFeeds({ feedIds: chat.feedIds }) : [])
        .flat()
        .map(([feedId, feed]) => feedPullHandler(feedId, feed));

    Promise.allSettled(promises).then(() => {
        setTimeout(checkFeeds, params.feedCheckFreq);
        log(`Next check in: ${params.feedCheckFreq / time.min(1)} min`);
    });
}

async function feedPullHandler(feedId: string, feed: Feed) {
    const freq = feed.checkFreq;
    if (feed.lastChecked + freq > Date.now()) return;
    
    const { feedItemPullCount, chatId } = feed;
    try
    {
        const items = await getFeed(feed.rssUrl, feedItemPullCount);
        if (!items) throw new Error(`ERROR: fetching feed "${feedId}"`);

        await feedUpdatesHandler(feedId, items);
    }
    catch (error)
    {
        log(error);
        cleanStack(error);
        if (env.isDev) debugger;

        bot.sendMsg(chatId, `ERROR: fetching feed "${feed.name}"`);
        feeds.set(feedId, { ...feed, lastChecked: Date.now() });
    }
}


async function feedUpdatesHandler(feedId: string, pulledFeedItems: FeedItem[])
{
    // store the feed items to json for later analytics
    storeFeedItems(feedId, pulledFeedItems);

    const feed = feeds.get(feedId);
    if (!feed) return log(`Feed not found: ${feedId}`);

    const chat = chats.get(feed.chatId);
    if (!chat || !chat.active) return log(`Chat not available: ${feed.chatId}`);
    
    const now = Date.now();
    const maxAge = feed.checkFreq * 3;
    const maxAgeDate = now - maxAge;

    const oldItems = filterFeedItems({ itemIds: feed.itemIds, maxAge: maxAgeDate });//(feeds[hashId]?.items || []).filter(x => !jobIsTooOld(x, freq * 2));
    const items = new Map(oldItems);

    const newItems = pulledFeedItems
        .filter(job => !jobIsTooOld(job, maxAge) && !items.has(job.linkHref))
        .sort((a, b) => a.updated - b.updated);

    newItems.forEach(job => items.set(job.linkHref, job));
    const itemIds = Array.from(items.keys());

    // [feed] Update the feed with the new items, and the last checked time
    feeds.set(feedId, { ...feed, itemIds, lastChecked: now });
    
    if (!newItems.length) return;

    // if time now is outside the dayStart and dayEnd, don't send the message
    const { start, end } = chatDatStartEndDates(chat, now);
    if (now > end.getTime() || now < start.getTime()) return;

    // if first message of the day use all jobs from `items`
    const isFirstMsgOfDay = now - feed.checkFreq < start.getTime();
    const sendItemsIds = isFirstMsgOfDay ? Array.from(items.keys()) : newItems.map(({ linkHref }) => linkHref);
    
    const { h, m } = msToTime(isFirstMsgOfDay ? maxAge : feed.checkFreq);
    const { chatId } = feed;

    bot.sendMsg(chatId, '📨');
    bot.sendMsg(chatId, `[📶]: ${feed.name}\n[📬]: ${sendItemsIds.length}\n[⏰]: ${h}h ${m}m`);
    sendItemsIds.forEach(jobId => bot.sendJob(chatId, jobId));
}


export function updateMsgs()
{
    log('Updating messages...');
    jobMsgs.forEach(({ feedItemId, date }, jobMsgId): any => {
        const item = feedItems.has(feedItemId);
        if (!item) {
            console.log(`FeedItem not found: ${feedItemId}`);
            return jobMsgs.delete(jobMsgId);
        }

        bot.updateJobMsg(jobMsgId, date + params.maxJobUpdateAge);
    });

    setTimeout(updateMsgs, time.min(1.5));
}