// main.ts //
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
import { Bot } from './bot/bot';

const params =
{
    feedCheckFreq: time.min(1),
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

        await updateMsgs();
        log('[2]: MSG TIMES-UPDATER STARTED');

        checkFeeds();
        log('[3]: FEED CHECKER STARTED');

        await import('./bot/commands.bot');
        log('[4]: COMMANDS INITIALIZED');

        const botInfo = await bot.getBotInfo();
        chats.forEach((chat, chatId) =>
        {
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

async function checkFeeds()
{
    log(`Checking feeds...`);

    const promises = Array.from(chats.values())
        .map((chat) => chat.active ? filterFeeds({ feedIds: chat.feedIds }) : [])
        .flat()
        .map(([feedId, feed]) => feedPullHandler(feedId, feed));

    await Promise.allSettled(promises).then(() => {
        setTimeout(checkFeeds, params.feedCheckFreq);
        chats.update(chats => chats);
        log(`Next check in: ${params.feedCheckFreq / time.min(1)} min`);
    });
}

async function feedPullHandler(feedId: string, feed: Feed)
{
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
        log(cleanStack(error));
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
    if (!feed) return log(`Feed not found: ${feedId}`);

    const chat = chats.get(feed.chatId);
    if (!chat || !chat.active) return log(`Chat not available: ${feed.chatId}`);
    
    const now = Date.now();
    const maxAge = feed.checkFreq * 3;
    
    const sentItems = new Map(filterFeedItems({ itemIds: chat.idsOfSentFeedItems }));
    const newItems = pulledFeedItems
        .filter(job => !jobIsTooOld(job, maxAge) && !sentItems.has(job.linkHref))
        .sort((a, b) => a.updated - b.updated); // sort oldest to newest

    // [feed Update] with last checked time
    feeds.set(feedId, { ...feed, lastChecked: now });

    // logic if to send msgs
    const { start, end } = chatDatStartEndDates(chat, now);
    if (!newItems.length || now > end.getTime() || now < start.getTime()) return;
    
    const isFirstMsgOfDay = now - feed.checkFreq <= start.getTime();
    const { h, m } = msToTime(isFirstMsgOfDay ? maxAge : Date.now() - feed.lastChecked + feed.checkFreq);
    const { chatId } = feed;

    bot.sendMsg(chatId, '📨');
    const firstMsg = isFirstMsgOfDay ? "Starting your day with new opportunities for you to discover!\n\n" : '';
    bot.sendMsg(chatId, firstMsg + `[📶]: ${feed.name}\n[📬]: ${newItems.length}\n[⏰]: ${h}h ${m}m`);
    const promises = newItems.map(job => bot.sendJob(chatId, job.linkHref));

    const res = await Promise.all(promises);
    if (env.isDev && res.find(x => !x?.ok)) debugger;

    res.forEach((val) =>
    {
        if (!val?.ok) return;
        chat.idsOfSentFeedItems.push(val.out.jobMsg.feedItemId);
    });
}


export async function updateMsgs()
{
    log('Updating messages...');
    const promises: ReturnType<Bot['updateJobMsg']>[] = [];
    jobMsgs.forEach(({ feedItemId, date }, jobMsgId): any =>
    {
        if (!feedItems.has(feedItemId)) {
            console.log(`FeedItem not found: ${feedItemId}`);
            return jobMsgs.delete(jobMsgId);
        }

        promises.push(
            bot.updateJobMsg(jobMsgId, date + params.maxJobUpdateAge)
        );
    });

    await Promise.all(promises).then(() =>
    {
        jobMsgs.update(jobMsgs => jobMsgs);
        setTimeout(updateMsgs, time.min(1.25));
        // TODO: sent feed items
    });
}
