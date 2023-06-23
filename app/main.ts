// main.ts //
/**
 * !TODO:
 * - Ensure msg was delivered before storing the corresponding feed item
 * - Allow to filter out jobs by country
 * - Analytics for each feed (hour by hour n of post by day of week)
 */

// -- Init -- //
import './init';

// -- Imports -- //
import { bot, chats, feeds, jobMsgs, feedItems, storeFeedItems } from './store/store';
import { writeFile } from './utils/utils';
import { botCmds } from './bot/commands.bot';
import { chatTimeInfo, getTime, msToTime, time, wait } from './utils/time.utils';
import { filterFeedItems, getFeed } from './feed';
import { Bot } from './bot/bot';

const params =
{
    feedCheckInterval: time.min(1),
    feedCheckFreq: time.min(env.isDev ? 1 : 5),
    maxJobUpdateAge: time.hrs(3),
}

// -- App Start -- //
setTimeout(async () =>
{
    try {
        // Write the commands to a file to share with "BotFather"
        writeFile('../bot-commands', Object.entries(botCmds).reduce((acc, [cmd, description]) => {
            acc += `${cmd.slice(1)} - ${description}\n`;
            return acc;
        }, ''));

        bot.start().then(() => log('[*] BOT INITIALIZED'));
        log('[1]: BOT STARTING...');

        await import('./bot/commands.bot');
        log('[2]: BOT COMMANDS INITIALIZED');

        await dayStartEndMsgs();
        log('[3]: DAY START/END MSGS STARTED');

        wait(time.min(1)).then(() => updateMsgs());
        log('[4]: MSG TIMES-UPDATER STARTED');

        const botInfo = await bot.getBotInfo();
        const proms = chats.entriesArr().map(async ([chatId, chat]) =>
        {
            const { isDayEnd } = chatTimeInfo(chat);
            if (!chat.active || isDayEnd || env.isDev) return;

            await bot.sendMsg(chatId, '💻');
            await bot.sendMsg(chatId, `"Server restarted, '${botInfo.first_name}' is back online!"`
                + `\n\n😎 I'm ready to find you some jobs!`);
        });

        await Promise.all(proms);
        log('[5]: BOT RESTARTED MSGS SENT');

        checkFeeds();
        log('[6]: FEED CHECKER STARTED');

        log('[Final]: APP INITIALIZED');
    } catch(error) {
        logErr(error);
        if (env.isDev) debugger;
    }
});

// -- // FEED CHECKER // -- //
async function checkFeeds()
{
    log(`Checking feeds...`);
    const now = Date.now();
    const doCheckFeed: { [feedId: string]: boolean | undefined } = {};
    chats.forEach((chat, chatId) =>
    {
        const { isDayEnd } = chatTimeInfo(chat);
        if (!chat.active || isDayEnd)
            return isDayEnd && log(`Chat: ${chatId} 'isDayEnd'`);

        chat.feedIds.forEach(feedId =>
        {
            const feed = feeds.get(feedId);
            if (!feed) return logErr(`Feed not found: ${feedId}`);
            
            if (!(feed.lastChecked + params.feedCheckFreq < now)) return;
            doCheckFeed[feedId] = true;
        });
    });

    const promises = Array.from(feeds.entries())
        .map(([feedId, feed]) => doCheckFeed[feedId] && feedPullHandler(feedId, feed));

    await Promise.allSettled(promises).then(() => {
        setTimeout(checkFeeds, params.feedCheckInterval);
        chats.update(chats => chats);
        log(`Next check in: ${params.feedCheckInterval / time.min(1)} min`);
    });
}

async function feedPullHandler(feedId: string, feed: Feed)
{
    log(`\n[${feedId}]: ${feed.name}`);
    const { feedItemPullCount, chatId } = feed;
    try
    {
        const items = await getFeed(feed.rssUrl, feedItemPullCount);
        if (!items) throw new Error(`ERROR: fetching feed "${feedId}"`);

        await feedUpdatesHandler(feedId, items);
    }
    catch (error)
    {
        logErr(error);
        if (env.isDev) debugger;

        feeds.set(feedId, { ...feed, lastChecked: Date.now() });
        bot.sendMsg(chatId, `ERROR: fetching feed "${feed.name}"`);
    }
}

async function feedUpdatesHandler(feedId: string, pulledFeedItems: FeedItem[])
{
    // store feedItems to json (for analytics) & `feedItems: MapState<string, FeedItem>`
    storeFeedItems(feedId, pulledFeedItems);

    const feed = feeds.get(feedId);
    if (!feed) return logErr(`Feed not found: ${feedId}`);

    const chat = chats.get(feed.chatId);
    if (!chat)return logErr(`Chat not available: ${feed.chatId}`);

    if (!chat.active) return;
    const now = Date.now();
    const jobIsTooOld = (job: FeedItem, noOlderThan = feed.checkFreq * 3) =>
        getTime(job.updated) < (now - noOlderThan);
    
    const sentItems = new Map(filterFeedItems({ itemIds: chat.idsOfSentFeedItems }));
    const newItems = pulledFeedItems
        .filter(job => !jobIsTooOld(job) && !sentItems.has(job.linkHref))
        .sort((a, b) => a.updated - b.updated); // sort oldest to newest

    // [feed Update] with last checked time
    const prevLastChecked = feed.lastChecked;
    feeds.set(feedId, { ...feed, lastChecked: now });
    
    log(`\n${feed.chatId} [${feed.name}]: ${newItems.length} new items`);
    if (!newItems.length) return;
    
    const { start, disabled } = chatTimeInfo(chat);
    const isFirstMsgOfDay = !disabled && (now - params.feedCheckFreq <= start);

    const { h, m } = msToTime(now - prevLastChecked);
    const tLastChecked = `${h}h ${m}m`;

    const { chatId } = feed;
    bot.sendMsg(chatId, '📨');
    const firstMsg = isFirstMsgOfDay ? "Starting your day with new opportunities for you to discover!\n\n" : '';
    bot.sendMsg(chatId, firstMsg + `[📶]: ${feed.name}\n[📬]: ${newItems.length}\n[⏰]: ${tLastChecked}`);
    const promises = newItems.map(job => bot.sendJob(chatId, job.linkHref));

    const res = await Promise.all(promises);
    res.forEach((val) =>
    {
        if (!val?.ok) return;
        chat.idsOfSentFeedItems.push(val.out.jobMsg.feedItemId);
    });
}

// -- // UPDATE MSGS // -- //
export async function updateMsgs()
{
    log('Updating messages...');
    const promises: ReturnType<Bot['updateJobMsg'] | Bot['deleteJobMsg']>[] = [];
    jobMsgs.forEach(({ feedItemId, date }, jobMsgId): any =>
    {
        if (!feedItems.has(feedItemId)) {
            log(`FeedItem not found: ${feedItemId}`);
            return promises.push(bot.deleteJobMsg(jobMsgId));
        }

        promises.push(
            bot.updateJobMsg(jobMsgId, date + params.maxJobUpdateAge)
        );
    });

    await Promise.all(promises).then(() =>
    {
        jobMsgs.update(jobMsgs => jobMsgs);
        setTimeout(updateMsgs, time.min(1.5));
    });
}

// -/-/- // -- SEND DAY START/END MSGS -- // -/-/- //
async function dayStartEndMsgs() {
    const promises = chats.entriesArr().map(async ([chatId, chat]) => {
        if (!chat.active) return;
        const { lastDayStartEndMsg: last = { start: 0, end: 0 } } = chat;
        const { start, end, isDayEnd, disabled } = chatTimeInfo(chat);
        if (disabled) return;
        
        if (isDayEnd && end > last.end)
        {
            await bot.sendMsg(chatId, '🌛');
            await bot.sendMsg(chatId, chat.dayEndMsg || 'Good night! (No more messages for today)');
            chats.set(chatId, { ...chat, lastDayStartEndMsg: { start: last.start, end } });
        }
        if (!isDayEnd && start > last.start)
        {
            await bot.sendMsg(chatId, '🌞');
            await bot.sendMsg(chatId, chat.dayStartMsg || 'Good morning! (Messages are back on)');
            chats.set(chatId, { ...chat, lastDayStartEndMsg: { start, end: last.end } });
        }
    });

    await Promise.all(promises).then(() => setTimeout(dayStartEndMsgs, time.min(1)));
};