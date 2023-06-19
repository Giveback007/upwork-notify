import { genChat, genFeed, handleZod } from "../utils/utils";
import { bot, chats, feeds, users } from "../store/store";
import { feedItemParamsSchema } from "../schemas/feed-item-params.schema";
import TelegramBot, { Message } from "node-telegram-bot-api";
import { filterFeeds } from "../feed";
import { randomUUID as UUID } from 'crypto';
import { find as findTz } from 'geo-tz';
import { msToTime, parseHhMm, time, toStrHhMm } from "../utils/time.utils";

// --- // ChatStates Types // --- //
type ChatStates =
    | UrlAddState
    | UrlDeleteState
    | UrlListState
    | TimeZoneState
    | SetDayStartState
    | SetDayEndState
    | ChatInfoState
    | SetStartMsgState
    | SetEndMsgState;

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

enum setDayStartStep { INIT, TIME, }
type SetDayStartState = IChatState &
{
    type: '/set_day_start';
    step?: setDayStartStep;
    /** hour-24, minutes-59 */
    // time?: [number, number];
};

enum setDayEndStep { INIT, TIME, }
type SetDayEndState = IChatState &
{
    type: '/set_day_end';
    step?: setDayEndStep;
    /** hour-24, minutes-59 */
    // time?: [number, number];
};

enum chatInfoStep { INIT, }
type ChatInfoState = IChatState &
{
    type: '/chat_info';
    step?: chatInfoStep;
};

enum setStartMsgStep { INIT, MSG, }
type SetStartMsgState = IChatState &
{
    type: '/set_start_msg';
    step?: setStartMsgStep;
};

enum setEndMsgStep { INIT, MSG, }
type SetEndMsgState = IChatState &
{
    type: '/set_end_msg';
    step?: setEndMsgStep;
};

// -- // Command Lists // -- //
type NonStateCmds = '/start' | '/stop' | '/cancel';
export const botCmds: { [cmd in ChatStates['type'] | NonStateCmds]: string } =
{
    '/url_add': 'Add an Upwork url',
    '/urls': 'Get the list of urls',
    '/url_del': 'Delete an Upwork url',
    '/cancel': 'Cancel the current command',
    '/set_timezone': 'Set the timezone',
    '/set_day_start': 'Set the day start time',
    '/set_day_end': 'Set the day end time',
    "/chat_info": 'Get the chat info',
    '/start': 'Start the bot',
    '/stop': 'Stop the bot',
    '/set_start_msg': 'Set the start day message',
    '/set_end_msg': 'Set the end day message',
}

const cmdRegx = (Object.keys(botCmds) as (keyof typeof botCmds)[])
    .map((cmd) => ({ cmd, regx: `^${cmd}(${bot.username})?$` }));

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
    if (!from || from.isBot || msg.location) return;

    const { chatId, userId } = from;
    const state = chatStates.get(chatId);
    if (!state || state.userId !== userId) return;

    // Check if command & exit if is
    if (msg.text?.startsWith('/'))
    {
        const cmd = cmdRegx.find(({ regx }) => msg.text?.match(regx));
        if (cmd) return;
    }
    
    chatStateHandler(state, msg);
});

bot.getBot().on('location', (msg) =>
{
    const from = vldtUser(msg);
    if (!from || from.isBot) return;
    
    chatStateHandler({ ...from, type: '/set_timezone', step: timeZoneStep.TIMEZONE }, msg);
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
            return setTimeZoneHandler(state, msg);
        case '/set_day_start':
            return setDayStartHandler(state, text);
        case '/set_day_end':
            return setDayEndHandler(state, text);
        case '/chat_info':
            return chatInfoHandler(state);
        case '/set_start_msg':
            return setStartMsgHandler(state, text);
        case '/set_end_msg':
            return setEndMsgHandler(state, text);
        default:
            // this should never happen
            const errMsg = `ERROR: Unhandled ChatState type: ${(state as any).type}`;
            bot.sendMsg(chatId, errMsg);
            logErr(new Error(errMsg));
            if (env.isDev) debugger;
    }
}

// --- // ChatState Handlers // --- //
function setStartMsgHandler(state: SetStartMsgState, text: string): any
{
    const { chatId } = state;

    switch (state.step)
    {
        case setStartMsgStep.INIT:
            state.step++;
            return bot.sendMsg(chatId, 'Enter the message to send at the start of the day');
        case setStartMsgStep.MSG:
            const chat = chats.get(chatId);
            if (!chat) return bot.sendMsg(chatId, 'ERROR: Unexpected Error: "Chat not found"');

            chat.dayStartMsg = text;
            chats.set(chatId, chat);

            chatStates.delete(chatId);
            return bot.sendMsg(chatId, 'Message set');
        default: unhandledCommand(state, chatId);
    }
}

function setEndMsgHandler(state: SetEndMsgState, text: string): any
{
    // Fill in the function
    const { chatId } = state;

    switch (state.step)
    {
        case setEndMsgStep.INIT:
            state.step++;
            return bot.sendMsg(chatId, 'Enter the message to send at the end of the day');
        case setEndMsgStep.MSG:
            const chat = chats.get(chatId);
            if (!chat) return bot.sendMsg(chatId, 'ERROR: Unexpected Error: "Chat not found"');

            chat.dayEndMsg = text;
            chats.set(chatId, chat);

            chatStates.delete(chatId);
            return bot.sendMsg(chatId, 'Message set');
        default: unhandledCommand(state, chatId);
    }
}

function chatInfoHandler(state: ChatInfoState): any
{
    const { chatId } = state;

    switch (state.step)
    {
        case chatInfoStep.INIT:
            const chat = chats.get(chatId);
            if (!chat) return bot.sendMsg(chatId, 'ERROR: Unexpected Error: "Chat not found"');

            const now = Date.now();
            const { timeZone, dayStart, dayEnd, feedIds } = chat;
            const dayStartStr = dayStart ? `${toStrHhMm(dayStart)}` : 'Not set';
            const dayEndStr = dayEnd ? `${toStrHhMm(dayEnd)}` : 'Not set';
            const dayStartMsg = chat.dayStartMsg || 'Not set';
            const dayEndMsg = chat.dayEndMsg || 'Not set';
            const feedList = filterFeeds({feedIds}).map(([, feed], i) =>
            {
                const { name, lastChecked } = feed;
                const { h, m } = msToTime(now - lastChecked);

                return `[${i + 1}]: (${h}h ${(m.toString().padStart(2 , '0'))}m) ${name}`
            }).join('\n') || 'No feeds added';

            const msg = ''
                + `\nTimezone: "${timeZone}"\n`
                + `\nDay Start: ${dayStartStr}`
                + `\nDay End: ${dayEndStr}\n`
                + `\nDay Start Msg: \n"${dayStartMsg}"\n`
                + `\nDay End Msg: \n"${dayEndMsg}"\n`
                + `\nFeeds:\n${feedList}`;
            

            chatStates.delete(chatId);
            return bot.sendMsg(chatId, msg);
        default: unhandledCommand(state, chatId);

    }
}

function setDayEndHandler(state: SetDayEndState, text: string): any
{
    const { chatId, step } = state;

    switch (step)
    {
        case setDayEndStep.INIT:
            state.step!++;
            return bot.sendMsg(chatId,
                'Please enter the time to end your day (HH:MM)\n\nExamples:'
                + '\n19:30'
                + '\n7:30pm');
        case setDayEndStep.TIME:
            const time = parseHhMm(text);
            if (!time) return bot.sendMsg(chatId, 'Invalid time format.\nPlease try again');

            const chat = chats.get(chatId);
            if (!chat) return bot.sendMsg(chatId, 'ERROR: Unexpected Error: "Chat not found"');

            chats.set(chatId, { ...chat, dayEnd: time });

            chatStates.delete(chatId);
            return bot.sendMsg(chatId, `Your "day end" time is now set to ${toStrHhMm(time)}`);
        default: unhandledCommand(state, chatId);
    }
}

function setDayStartHandler(state: SetDayStartState, text: string): any
{
    const { chatId, step } = state;

    switch (step)
    {
        case setDayStartStep.INIT:
            state.step!++;
            return bot.sendMsg(chatId,
                'Please enter the time to start your day (HH:MM)\n\nExamples:'
                + '\n15:30'
                + '\n3:30pm');
        case setDayStartStep.TIME:
            const time = parseHhMm(text);
            if (!time) return bot.sendMsg(chatId, 'Invalid time format.\nPlease try again');

            const chat = chats.get(chatId);
            if (!chat) return bot.sendMsg(chatId, 'ERROR: Unexpected Error: "Chat not found"');

            chats.set(chatId, { ...chat, dayStart: time });

            chatStates.delete(chatId);
            return bot.sendMsg(chatId, `Your "day start" is set to: "${toStrHhMm(time)}"`);
        default: unhandledCommand(state, chatId);
    }
}

function setTimeZoneHandler(state: TimeZoneState, msg: TelegramBot.Message): any
{
    const { chatId, step } = state;

    switch (step)
    {
        case timeZoneStep.INIT:
            return bot.sendMsg(chatId, 'Please share your location');
        case timeZoneStep.TIMEZONE:
            if (!msg.location) return bot.sendMsg(chatId, 'Could not get your location.\nPlease share your location');
            const [lat, lon] = [msg.location.latitude, msg.location.longitude];
            const [timeZone] = findTz(lat, lon);

            if (!timeZone)
                return bot.sendMsg(chatId, 'Could not get your timezone.\nPlease try again.');

            chats.set(chatId, { ...chats.get(chatId)!, timeZone });

            chatStates.delete(chatId);
            return bot.sendMsg(chatId, `Your timezone is set to: "${timeZone}"`);
        default: unhandledCommand(state, chatId);
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
            {
                chatStates.delete(chatId);
                return bot.sendMsg(chatId, `No URLs added yet.`);
            }

            const msgText = chatFeeds
                .map(([,feed], i) => `${i + 1}. ${feed.name}\nURL: ${feed.rssUrl}`)
                .join('\n\n');

            // Confirmation message
            bot.sendMsg(chatId, '[📶 Upwork Feeds]:\n\n' + msgText)
            return chatStates.delete(chatId);
        default: unhandledCommand(state, chatId);
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
            {
                chatStates.delete(chatId);
                return bot.sendMsg(chatId, `No URLs added yet.`);
            }

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
        default: unhandledCommand(state, chatId);
    }
}

function urlAddHandler(state: UrlAddState, text: string): any
{
    const { chatId, userId, step } = state;

    switch (step)
    {
        case urlAddStep.INIT:
            state.step!++;
            return bot.sendMsg(chatId, `Please provide the URL.`);
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
            const feed = filterFeeds({ chatId }).find(([,{ name }]) => name === text);
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

            const chat = chats.get(chatId);
            if (!chat) return bot.sendMsg(chatId, `ERROR: Chat data not found.`);

            const feedId = UUID();
            chat.feedIds.push(feedId);
            
            feeds.set(feedId, genFeed(data));
            chats.set(chatId, chat);
            
            // Confirmation message
            chatStates.delete(chatId);
            return bot.sendMsg(chatId, `Added [📶]:\nName: "${text}"\nURL: ${state.rssUrl}`);
        default: unhandledCommand(state, chatId);
            
    }
}

// -- // Unhandled Commands // -- //
function unhandledCommand(state: ChatStates, chatId: string): any
{
    // this should never happen
    const errMsg = `Unhandled ChatState: ${(state as any).step}`;
    bot.sendMsg(chatId, errMsg);
    logErr(new Error(errMsg));
    logErr(state);
    if (env.isDev) debugger;
}

// --- // COMMANDS // --- //
const vldtUser = (msg: Message) =>
{
    // TODO: Here we can also validate if the user is allowed to use the bot
    const { chat, from } = msg;
    const chatId = chat.id.toString();

    if (!from || !from.username)
    {
        bot.sendMsg(chatId, "Can't get user info.");
        return null;
    }

    if (!bot.validateUser(from))
    {
        bot.sendMsg(chatId, "Sorry, this bot isn't available.");
        return null;
    }

    const user = users.get(from.username)!;
    return { chatId, userId: from.id.toString(), isBot: from.is_bot, roles: user.roles };
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
        bot.sendMsg(from.chatId, `Welcome! I am ready to find jobs for you!\n`
            + `\n  - Share your location to set your timezone.\n  - Use /url_add to add a new feed.`);
    }
    else
    {
        if (chat.active)
            bot.sendMsg(from.chatId, `😄 I am already working!`);
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
        chats.set(chatId, chat);
        bot.sendMsg(chatId, `I am now offline. Use /start to start me again.`);
    }
});

bot.getBot().onText(/\/add_user( .+)?/, (msg, match): any =>
{
    const from = vldtUser(msg);
    if (!from || !from.roles.admin) return;
    let username = (match?.[1]) ? (match[1]?.trim()) : undefined;

    // Check if a username was provided
    if (!username) {
        bot.sendMsg(from.chatId, `Username "${username}" is not valid`);
    } else {
        const user = users.get(username);
        if (user) return bot.sendMsg(from.chatId, `Username "${username}" is already added`);
        if (!username.startsWith('@')) username = `@${username}`;

        users.set(username, { isActive: true, roles: {}, username });
        bot.sendMsg(from.chatId, `Username "${username}" has been added`);
    }
});

bot.getBot().onText(/\/del_user( .+)?/, (msg, match): any =>
{
    const from = vldtUser(msg);
    if (!from || !from.roles.admin) return;
    const delUser = (match?.[1]) ? (match[1]?.trim()) : null;

    // Check if a username was provided
    if (!delUser) {
        bot.sendMsg(from.chatId, `Username "${delUser}" is not valid`);
    } else {
        const user = users.get(delUser);
        if (!user) return bot.sendMsg(from.chatId, `Username "${delUser}" does not exist in the database`);

        users.set(delUser, { ...user, isActive: false });
        bot.sendMsg(from.chatId, `Username "${delUser}" has been set to inactive`);
    }
});


cmdRegx.forEach(({ cmd, regx }) =>
{
    bot.getBot().onText(new RegExp(regx, 'i'), (msg) =>
    {
        const from = vldtUser(msg);
        log(`Command: '${cmd}'`, { auth: !!from,  from: msg.from?.username, msg: msg.text })
        if (!from) return;

        const { chatId } = from;
        const chat = chats.get(chatId);
        const state = chatStates.get(chatId);

        if (!chat?.active) return;

        if (state)
        {
            chatStates.delete(chatId);
            bot.sendMsg(chatId, `Canceling: "${state.type}"` + (cmd === '/cancel' ? '' : `\nStarting: "${cmd}"`));
        }

        if (cmd === '/cancel' || cmd === '/start' || cmd === '/stop') return;
        chatStateHandler({ ...from, type: cmd }, msg);
    });
});
