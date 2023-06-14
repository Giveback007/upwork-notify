import { genChat, genFeed, handleZod, time } from "../utils/utils";
import { bot, chats, feeds } from "../store/store";
import { feedItemParamsSchema } from "../schemas/feed-item-params.schema";
import TelegramBot, { Message } from "node-telegram-bot-api";
import { filterFeeds } from "../feed";
import { randomUUID as UUID } from 'crypto';
import { find } from 'geo-tz';

/*
Commands:
start - Start the bot
stop - Stop the bot
cancel - Cancel the current command
url_add - Add an Upwork url
url_del - Delete an Upwork url
urls - Get the list of urls
set_timezone - Set the timezone
*/

// --- // ChatStates Types // --- //
type ChatStates =
    | UrlAddState
    | UrlDeleteState
    | UrlListState
    | TimeZoneState;

type IChatState =
{
    userId: string;
    chatId: string;
    isBot: boolean;
    _updated?: number;
}

enum urlAddStep { INIT, URL, NAME, }
type UrlAddState = IChatState &
{
    type: '/url_add';
    step?: urlAddStep;
    rssUrl?: string;
    name?: string;
};

enum urlDeleteStep { INIT, URL, }
type UrlDeleteState = IChatState &
{
    type: '/url_del';
    step?: urlDeleteStep;
    feeds?: [string, Feed][];
}

enum urlListStep { INIT }
type UrlListState = IChatState &
{
    type: '/urls';
    step?: urlListStep;
};

enum timeZoneStep { INIT, TIMEZONE, }
type TimeZoneState = IChatState &
{
    type: '/set_timezone';
    step?: timeZoneStep;
    timeZone?: string;
};

// -- // Command Lists // -- //
const cmdList: (ChatStates['type'] | '/cancel')[] =
[
    '/url_add', '/urls', '/url_del', '/cancel',
    '/set_timezone',
    // '/set_day_start', '/set_day_end',
    // '/set_start_msg', '/check_feed'
]

const cmdRegx = cmdList.map((cmd) => ({
    cmd, regx: `^${cmd}(${bot.username})?$`
}));

// --- // ChatState // --- //
const chatStates = new Map<string, ChatStates>();

// State msg cleaner (command expire in 3 min)
setInterval(() =>
{
    const now = Date.now();
    chatStates.forEach((state, chatId) => {
        if (now - state._updated! < time.min(3)) return;

        chatStates.delete(chatId);
        bot.sendMsg(chatId, `Command: "${state.type}" cancelled due to inactivity`);
    });
}, time.sec(15));

// State msg checker
bot.getBot().on('message', (msg) =>
{
    const from = vldtUser(msg);
    if (!from || from.isBot) return;

    const { chatId, userId } = from;
    const state = chatStates.get(chatId);

    // Check if command & exit if is
    if (msg.text?.startsWith('/'))
    {
        const cmd = cmdRegx.find(({ regx }) => msg.text?.match(regx));
        if (cmd) return;
    }
    
    if (state && state.userId === userId)
    {
        chatStateHandler(state, msg);
    }
});

// State msg handler
function chatStateHandler(state: ChatStates, msg: TelegramBot.Message): any
{
    let { text } = msg;
    const { chatId } = state;

    state._updated = Date.now();
    state.step ??= 0;
    chatStates.set(chatId, state);
    text = text?.trim() || '';

    switch (state.type)
    {
        case '/urls':
            return urlsHandler(state);
        case '/url_add':
            return urlAddHandler(state, text);
        case '/url_del':
            return urlDeleteHandler(state, text);
        case '/set_timezone':
            return timeZoneHandler(state, msg);
        default:
            // this should never happen
            const errMsg = `ERROR: Unhandled ChatState type: ${(state as any).type}`;
            bot.sendMsg(chatId, errMsg);
            log(new Error(errMsg));
            if (env.isDev) debugger;
    }
}

function timeZoneHandler(state: TimeZoneState, msg: TelegramBot.Message): any
{
    const { chatId, step } = state;

    switch (step)
    {
        case timeZoneStep.INIT:
            state.step!++;
            return bot.sendMsg(chatId, 'Please share your location');
        case timeZoneStep.TIMEZONE:
            if (!msg.location) return bot.sendMsg(chatId, 'Could not get your location.\nPlease share your location');
            const [lat, lon] = [msg.location.latitude, msg.location.longitude];
            const [timeZone] = find(lat, lon);

            if (!timeZone)
                return bot.sendMsg(chatId, 'Could not get your timezone.\nPlease try again.');

            chats.set(chatId, { ...chats.get(chatId)!, timeZone });

            chatStates.delete(chatId);
            return bot.sendMsg(chatId, `Your timezone is set to: "${timeZone}"`);
        default:
            // this should never happen
            const errMsg = `Unhandled timeZoneStep: ${(state as any).step}`;
            bot.sendMsg(chatId, errMsg);
            log(new Error(errMsg));
            if (env.isDev) debugger;
    }
}

function urlsHandler(state: UrlListState): any
{
    const { chatId, step } = state;

    switch (step)
    {
        case urlListStep.INIT:
            const chatFeeds = filterFeeds({ chatId });

            if (chatFeeds.length === 0)
                return bot.sendMsg(chatId, `No URLs added yet.`);

            const msgText = chatFeeds
                .map(([,feed], i) => `${i + 1}. ${feed.name}\nURL: ${feed.rssUrl}`)
                .join('\n\n');

            // Confirmation message
            bot.sendMsg(chatId, '[📶 Upwork Feeds]:\n\n' + msgText)
            return chatStates.delete(chatId);
        default:
            // this should never happen
            const errMsg = `Unhandled urlListStep: ${(state as any).step}`;
            bot.sendMsg(chatId, errMsg);
            log(new Error(errMsg));
            if (env.isDev) debugger;
    }
}

function urlDeleteHandler(state: UrlDeleteState, text: string): any
{
    const { chatId, step } = state;

    switch (step)
    {
        case urlDeleteStep.INIT: {
            const feeds = filterFeeds({ chatId });

            if (feeds.length === 0)
                return bot.sendMsg(chatId, `No URLs added yet.`);

            state.feeds = feeds;
            state.step!++;

            // Generate the numbered list of feeds
            const msgText = feeds.map(([, feed], i) =>
            {
                return `${i + 1}: ${feed.name}`
            }).join('\n');

            // Ask the user which feed they want to delete
            return bot.sendMsg(chatId, `Which feed to delete? Answer with a number 1 to ${feeds.length}.\n\n${msgText}`);
        }
        case urlDeleteStep.URL:
        {
            const n = parseInt(text, 10);
            if (state.feeds === undefined)
            {
                if (env.isDev) debugger;
                return bot.sendMsg(chatId, `ERROR: state.feedIds is undefined`);
            }

            if (isNaN(n) || n < 1 || n > state.feeds.length)
                return bot.sendMsg(chatId, `Invalid number. Please respond with a number between 1 and ${state.feeds.length}.`);
            
            const [feedId, feed] = state.feeds[n - 1]!;
            if (!feed) return bot.sendMsg(chatId, `ERROR: Feed not found.`);
            feeds.delete(feedId);

            // Confirmation message
            bot.sendMsg(chatId, `Deleted Feed: ${feed.name}`);
            return chatStates.delete(state.chatId);
        }
        default:
            // this should never happen
            const errMsg = `Unhandled urlDeleteStep: ${(state as any).step}`;
            bot.sendMsg(chatId, errMsg);
            log(new Error(errMsg));
            if (env.isDev) debugger;
    }
}

function urlAddHandler(state: UrlAddState, text: string): any
{
    const { chatId, userId, step } = state;

    switch (step)
    {
        case urlAddStep.INIT:
            bot.sendMsg(chatId, `Please provide the URL.`);
            state.step!++;
            break;
        case urlAddStep.URL:
            if (!text.includes('https://www.upwork.com/ab/feed/jobs/atom')) {
                chatStates.delete(chatId);

                bot.sendMsg(chatId, '"/url_add" command cancelled')
                bot.sendMsg(chatId,
                    `Please provide a valid 'ATOM' link and write /url again
                    \nGo here to get one:
                    https://www.upwork.com/nx/jobs/search/`
                );
                bot.sendImg(chatId, joinMain('../assets/example-1.png'));
                return;
            }
            
            bot.sendMsg(chatId, `Great! Now a "Name" for this feed`);
            state.rssUrl = text;
            state.step!++;
            
            break;
        case urlAddStep.NAME:
            // const feedsData = feeds.get();
            
            const feed = Array.from(feeds).find(([,feed]) => feed.name === text);
            if (feed)
                return bot.sendMsg(chatId, `Name "${text}" is already being used.\n\nPlease try again with a different name.`);

            const zOut = handleZod(feedItemParamsSchema, {
                chatId,
                name: text,
                rssUrl: state.rssUrl,
                userId
            });

            if (zOut.type === 'ERROR' || zOut.type === 'ZOD_ERROR') 
                return bot.sendMsg(chatId, zOut.error.message);
            
            const { data } = zOut;
            data.lastChecked = Date.now();

            feeds.set(UUID(), genFeed(data));
            
            // Confirmation message
            bot.sendMsg(chatId, `Added [📶]:\nName: "${text}"\nURL: ${state.rssUrl}`);
            return chatStates.delete(chatId);
        default:
            // this should never happen
            const errMsg = `Unhandled urlAddStep: ${(state as any).step}`;
            bot.sendMsg(chatId, errMsg);
            log(new Error(errMsg));
            if (env.isDev) debugger;
    }
}

// --- // COMMANDS // --- //
const vldtUser = (msg: Message) =>
{
    // TODO: Here we can also validate if the user is allowed to use the bot
    const { chat, from } = msg;
    const chatId = chat.id.toString();

    if (!from)
    {
        bot.sendMsg(chatId, "Can't get user info.");
        return null;
    }

    if (!bot.validateUser(from))
    {
        bot.sendMsg(chatId, "Sorry, this bot isn't available.");
        return null;
    }

    return { chatId, userId: from.id.toString(), isBot: from.is_bot };
}

bot.getBot().onText(new RegExp(`^/start(${bot.username})?$`, 'i'), (msg) =>
{
    const from = vldtUser(msg);
    if (!from) return;
    const { chat: { type } } = msg;
    const chat = chats.get(from.chatId);

    if (!chat)
    {
        chats.set(from.chatId, genChat({ type, active: true }));
        bot.sendMsg(from.chatId, `Welcome! I am ready to find jobs for you!\n\nUse /add_url to add a new feed.`);
    }
    else
    {
        if (chat.active)
            bot.sendMsg(from.chatId, `😄 I am already working for you!`);
        else
        {
            chat.active = true;
            bot.sendMsg(from.chatId, `📶 I am back online!`);
        }
    }
});

bot.getBot().onText(new RegExp(`^/stop(${bot.username})?$`, 'i'), (msg) =>
{
    const from = vldtUser(msg);
    if (!from) return;
    const { chatId } = from;
    const chat = chats.get(from.chatId);
    
    if (!chat)
        bot.sendMsg(chatId, `I am not working yet. Use /start to start me.`);
    else if (!chat.active)
        bot.sendMsg(chatId, `I am already offline. Use /start to start me again.`);
    else
    {
        chat.active = false;
        bot.sendMsg(chatId, `I am now offline. Use /start to start me again.`);
    }
});

cmdRegx.forEach(({ cmd, regx }) =>
{
    bot.getBot().onText(new RegExp(regx, 'i'), (msg) =>
    {
        const from = vldtUser(msg);
        if (!from) return;

        const { chatId } = from;
        const state = chatStates.get(chatId);

        if (state)
        {
            chatStates.delete(chatId);
            bot.sendMsg(chatId, `Canceling: "${state.type}"` + (cmd === '/cancel' ? '' : `\nStarting: "${cmd}"`));
        }

        if (cmd === '/cancel') return;
        chatStateHandler({ ...from, type: cmd }, msg);
    });
});
