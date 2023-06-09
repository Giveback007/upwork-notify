import { handleZod, joinMain, time } from "../utils/utils";
import { bot, feedItems, feeds, hashId, jobMsgs } from "../store";
import { generateMessage } from "../utils/msg.utils";
import { filterFeeds, genFeed } from "../utils/feed.utils";
import { feedItemParamsSchema } from "../schemas/feed-item-params.schema";
import { Message } from "node-telegram-bot-api";

export function updateMsgTimes() {
    const now = Date.now();
    // remove messages older than 2 days
    const msgs = Object.entries(jobMsgs.get())
        .filter(([_, msg]) => now - msg.date * 1000 < time.day(2));
    
    jobMsgs.set(Object.fromEntries(msgs));

    const map = feedItems.get();
    msgs.forEach(([feedItemId, msg]) => {
        const item = map.get(feedItemId);
        if (!item) return;

        const msgUpdate = generateMessage(item);
        bot.update({ msg: msgUpdate, msgId: msg.message_id });
    });

    setTimeout(updateMsgTimes, time.min(1));
}

// --- // ChatStates Types // --- //
type ChatStates =
    | UrlAddState
    | UrlDeleteState
    | UrlUpdateState;

type IChatState = {
    userId: string;
    chatId: string;
    isBot: boolean;
    _updated: number;
}

type UrlAddState = IChatState & {
    type: '/url-add';
    step: 'URL' | 'NAME';
} & Partial<FeedParams>;

type UrlDeleteState = IChatState & {
    type: '/url-delete';
    feedIds: string[];
}

type UrlUpdateState = IChatState & {
    type: '/url-update';
    feedIds: string[];
    step: 'URL' | 'NAME';
} & Partial<FeedParams>;

// --- // ChatState // --- //
const chatStates = new Map<string, ChatStates>();
setInterval(() => {
    const now = Date.now();
    chatStates.forEach((state, chatId) => {
        if (now - state._updated > time.min(3)) {
            chatStates.delete(chatId);
            bot.send({ chatId , msg: `Command: ${state.type} cancelled due to inactivity` });
        }
    });
}, time.sec(10));

// State msg checker
bot.on('message', (msg) => {
    const { chat, text, from } = msg;
    const chatId = chat.id.toString();
    const userId = from?.id.toString() || null;
    const isBot = from?.is_bot || false;

    const state = chatStates.get(chatId);
    if (!isBot && state && userId === state.userId) {
        state._updated = Date.now();
        chatStateHandler(state, text);
    }
});

// State msg handler
function chatStateHandler(state: ChatStates, text: string | undefined): any {
    text = text?.trim() || '';
    const { chatId, userId } = state;

    switch (state.type) {
        case '/url-add':
            if (state.step === 'URL') { // Step 1
                if (!text.includes('https://www.upwork.com/ab/feed/jobs/atom') || !text.includes(' ')) {
                    chatStates.delete(chatId);

                    bot.send({ chatId, msg: '/url command cancelled'})
                    bot.send({ chatId, msg: `Please provide a valid 'ATOM' link and write /url again` });
                    bot.send({ chatId, msg: `Go here to get one:\nhttps://www.upwork.com/nx/jobs/search/` });
                    bot.send({ chatId, msg: joinMain('../assets/example-1.png') });
                    return;
                }
                
                state.rssUrl = text;
                state.step = 'NAME';
                
                bot.send({ chatId, msg: `Great! Now a "Name" for this feed` });
            } else if (state.step === 'NAME') { // Step 2
                state.name = text;

                const zOut = handleZod(feedItemParamsSchema, {
                    chatId,
                    name: state.name,
                    rssUrl: state.rssUrl,
                    userId
                });

                if (zOut.type === 'ERROR' || zOut.type === 'ZOD_ERROR') 
                    return bot.sendError(zOut.error.message, chatId);
                
                const { data } = zOut;
                data.lastChecked = Date.now();

                feeds.update({ [hashId(data.rssUrl)]: genFeed(data) });
                bot.send({ chatId, msg: `Feed added:\nName: ${state.name}\nURL: ${state.rssUrl}`});

                // Remove the state as we're done with this process
                chatStates.delete(chatId);
            }
            break;
        case '/url-delete':
                const n = parseInt(text, 10);
                if (isNaN(n) || n < 1 || n > state.feedIds.length) {
                    bot.send({ chatId, msg: `Invalid number. Please respond with a number between 1 and ${state.feedIds.length}.` });
                } else {
                    const hash = state.feedIds[n - 1] || '';
                    const feedsData = feeds.get();
                    const feed = feedsData[hash];
                    if (!feed) return bot.send({ chatId, msg: `ERROR: Feed not found.` });

                    delete feedsData[hash];
    
                    // Send a confirmation message to the chat
                    bot.send({ chatId, msg: `Deleted URL: ${feed.name}` });
                    chatStates.delete(state.chatId);
                }
                break;
        default:
            // this should never happen
            throw new Error(`Unknown ChatState type: ${(state as any).type}`);
    }
}

// --- // COMMANDS // --- //
const vldtMsg = (msg: Message) => {
    const { chat, from } = msg;
    const chatId = chat.id.toString();
    if (!from) {
        bot.send({ chatId, msg: "Can't get user info." });
        return null;
    }

    return { chatId, userId: from.id.toString(), isBot: from.is_bot };
}

// COMMAND: '/url-add' (start feed adding process)
bot.onText(/^\/url-add$/, (_msg) => {
    const from = vldtMsg(_msg);
    if (!from) return;
    const { chatId } = from;

    // Save the state for this chat
    chatStates.set(chatId, {
        ...from,
        type: '/url-add',
        step: 'URL',
        _updated: Date.now(),
    });

    // Ask the user for a URL
    bot.send({ chatId, msg: `Please provide the URL.`});
});

// COMMAND: '/urls' (list all the feeds)
bot.onText(/^\/urls$/, (_msg) => {
    const from = vldtMsg(_msg);
    if (!from) return;
    const { chatId } = from;

    // Get the feeds from the store
    const feedsData = feeds.get();

    // Filter out the feeds that were not added by this user
    const userFeeds = Object.values(feedsData).filter(feed => feed.chatId === chatId);

    if (userFeeds.length === 0) {
        bot.send({ chatId, msg: `No URLs added yet.` });
    } else {
        const msgText = userFeeds.map(feed => `Name: ${feed.name}\nURL: ${feed.rssUrl}`).join('\n\n');
        bot.send({ chatId, msg: msgText });
    }
});

// COMMAND: '/url-delete' (start feed deleting process)
bot.onText(/^\/url-delete$/, (_msg) => {
    const from = vldtMsg(_msg);
    if (!from) return;
    const { chatId } = from;

    const feedsData = feeds.get();
    const feedIds = filterFeeds({ chatId }, true);

        filterFeeds({ chatId }, true);

    if (feedIds.length === 0) {
        bot.send({ chatId, msg: `No URLs added yet.` });
    } else {
        chatStates.set(chatId, {
            ...from,
            type: '/url-delete',
            feedIds,
            _updated: Date.now(),
        });

        // Generate the numbered list of feeds
        const msgText = feedIds.map((hash, i) => {
            const feed = feedsData[hash]!;
            return `${i + 1}: ${feed.name}`
        }).join('\n');

        // Ask the user which feed they want to delete
        bot.send({ chatId, msg: `Which feed to delete? Answer with a number 1 to ${feedIds.length}.\n\n${msgText}` });
    }
});

// COMMAND: '/url-update' (start feed updating process)
bot.onText(/^\/url-update$/, (_msg) => {
    const from = vldtMsg(_msg);
    if (!from) return;
    const { chatId } = from;

    const feedsData = feeds.get();
    const feedIds = filterFeeds({ chatId }, true);

    if (feedIds.length === 0) {
        bot.send({ chatId, msg: `No URLs added yet.` });
    } else {
        chatStates.set(chatId, {
            ...from,
            type: '/url-update',
            feedIds,
            step: 'URL',
            _updated: Date.now(),
        });

        // Generate the numbered list of feeds
        const msgText = feedIds.map((hash, i) => {
            const feed = feedsData[hash]!;
            return `${i + 1}: ${feed.name}`
        }).join('\n');

        // Ask the user which feed they want to update
        bot.send({ chatId, msg: `Which feed do you want to update? Please respond with the number.\n\n${msgText}` });
    }
});
