import { handleZod, hashId, joinMain, time } from "../utils/utils";
import { bot, feeds } from "../store";
import { filterFeeds, genFeed } from "../utils/feed.utils";
import { feedItemParamsSchema } from "../schemas/feed-item-params.schema";
import { Message } from "node-telegram-bot-api";

/*
Commands:
start - Start the bot
cancel - Cancel the current command
url_add - Add an Upwork url
url_del - Delete an Upwork url
urls - Get the list of urls
*/

// --- // ChatStates Types // --- //
type ChatStates =
    | UrlAddState
    | UrlDeleteState
    | UrlListState;

type IChatState = {
    userId: string;
    chatId: string;
    isBot: boolean;
    _updated?: number;
}

enum urlAddStep { INIT, URL, NAME, }
type UrlAddState = IChatState & {
    type: '/url_add';
    step?: urlAddStep;
    rssUrl?: string;
    name?: string;
};

enum urlDeleteStep { INIT, URL, }
type UrlDeleteState = IChatState & {
    type: '/url_del';
    step?: urlDeleteStep;
    feedIds?: string[];
}

enum urlListStep { INIT }
type UrlListState = IChatState & {
    type: '/urls';
    step?: urlListStep;
};

// --- // ChatState // --- //
const chatStates = new Map<string, ChatStates>();

// State msg cleaner (command expire in 3 min)
setInterval(() => {
    const now = Date.now();
    chatStates.forEach((state, chatId) => {
        if (now - state._updated! < time.min(3)) return;

        chatStates.delete(chatId);
        bot.send({ chatId , msg: `Command: ${state.type} cancelled due to inactivity` });
    });
}, time.sec(10));

// State msg checker
bot.on('message', (msg) => {
    const from = vldtUser(msg);
    
    if (!from) return;
    const { chatId, isBot, userId } = from;
    const state = chatStates.get(chatId);
    
    if (!isBot && state && userId === state.userId) {
        chatStateHandler(state, msg.text);
    }
});

// State msg handler
function chatStateHandler(state: ChatStates, text?: string | undefined): any {
    const { chatId } = state;

    state._updated = Date.now();
    state.step ??= 0;
    chatStates.set(chatId, state);
    text = text?.trim() || '';

    switch (state.type) {
        case '/urls':
            return urlsHandler(state);
        case '/url_add':
            return urlAddHandler(state, text);
        case '/url_del':
            return urlDeleteHandler(state, text);
        default:
            // this should never happen
            bot.sendError(`Unhandled ChatState type: ${(state as any).type}`, chatId);
    }
}

function urlsHandler(state: UrlListState): any {
    const { chatId, step } = state;

    switch (step) {
        case urlListStep.INIT:
            const chatFeeds = filterFeeds({ chatId });

            if (chatFeeds.length === 0)
                return bot.send({ chatId, msg: `No URLs added yet.` });

            const msgText = chatFeeds
                .map((feed, i) => `${i + 1}. ${feed.name}\nURL: ${feed.rssUrl}`)
                .join('\n\n');

            chatStates.delete(chatId);
            return bot.send({ chatId, msg: '[📶 Upwork Feeds]:\n\n' + msgText });
        default:
            // this should never happen
            bot.sendError(`Unhandled ChatState step: ${(state as any).step}`, chatId);
    }
}

function urlDeleteHandler(state: UrlDeleteState, text: string): any {
    const { chatId, step } = state;

    switch (step)
    {
        case urlDeleteStep.INIT: {
            const feedIds = filterFeeds({ chatId }, true);

            if (feedIds.length === 0)
                return bot.send({ chatId, msg: `No URLs added yet.` });

            state.feedIds = feedIds;
            state.step!++;

            // Generate the numbered list of feeds
            const feedsData = feeds.get();
            const msgText = feedIds.map((hash, i) => {
                const feed = feedsData[hash]!;
                return `${i + 1}: ${feed.name}`
            }).join('\n');

            // Ask the user which feed they want to delete
            return bot.send({ chatId,
                msg: `Which feed to delete? Answer with a number 1 to ${feedIds.length}.\n\n${msgText}`
            });
        }
        case urlDeleteStep.URL:
        {
            const n = parseInt(text, 10);
            if (state.feedIds === undefined)
                return bot.sendError(`state.feedIds is undefined`, chatId);

            if (isNaN(n) || n < 1 || n > state.feedIds.length)
                return bot.send({ chatId,
                    msg: `Invalid number. Please respond with a number between 1 and ${state.feedIds.length}.`
                });
            
            const hash = state.feedIds[n - 1] || '';
            const feedsData = feeds.get();
            const feed = feedsData[hash];
            if (!feed) return bot.send({ chatId, msg: `ERROR: Feed not found.` });

            delete feedsData[hash];
            feeds.set(feedsData);

            // Send a confirmation message to the chat
            bot.send({ chatId, msg: `Deleted URL: ${feed.name}` });
            return chatStates.delete(state.chatId);
        }
        default:
            // this should never happen
            bot.sendError(`Unhandled ChatState step: ${(state as any).step}`, chatId);
    }
}

function urlAddHandler(state: UrlAddState, text: string): any {
    const { chatId, userId, step } = state;

    switch (step) {
        case urlAddStep.INIT:
            bot.send({ chatId, msg: `Please provide the URL.`});
            state.step!++;
            break;
        case urlAddStep.URL:
            if (!text.includes('https://www.upwork.com/ab/feed/jobs/atom')) {
                chatStates.delete(chatId);

                bot.send({ chatId, msg: '"/url_add" command cancelled'})
                bot.send({ chatId, msg:
                    `Please provide a valid 'ATOM' link and write /url again
                    \nGo here to get one:
                    https://www.upwork.com/nx/jobs/search/`
                });
                bot.send({ chatId, msg: joinMain('../assets/example-1.png'), type: 'img' });
                return;
            }
            
            bot.send({ chatId, msg: `Great! Now a "Name" for this feed` });
            state.rssUrl = text;
            state.step!++;
            
            break;
        case urlAddStep.NAME:
            const feedsData = feeds.get();
            const feed = Object.values(feedsData).find((feed) => feed.name === text);
            if (feed) {
                bot.send({ chatId, msg: `ERROR: Name "${text}" is already being used.\n\nPlease try again with a different name.` });
                return;
            }

            const zOut = handleZod(feedItemParamsSchema, {
                chatId,
                name: text,
                rssUrl: state.rssUrl,
                userId
            });

            if (zOut.type === 'ERROR' || zOut.type === 'ZOD_ERROR') 
                return bot.sendError(zOut.error.message, chatId);
            
            const { data } = zOut;
            data.lastChecked = Date.now();

            feeds.update({ [hashId(data.rssUrl)]: genFeed(data) });
            bot.send({ chatId, msg: `Added [📶]: ${text}:\nName: ${text}\nURL: ${state.rssUrl}`});

            // Remove the state as we're done with this process
            return chatStates.delete(chatId);
        default:
            bot.sendError(`Unhandled urlAddStep: ${(state as any).step}`, chatId);
            break;
    }
}

// --- // COMMANDS // --- //
const vldtUser = (msg: Message) => {
    // TODO: Here we can also validate if the user is allowed to use the bot
    const { chat, from } = msg;
    const chatId = chat.id.toString();

    if (!from) {
        bot.send({ chatId, msg: "Can't get user info." });
        return null;
    }

    return { chatId, userId: from.id.toString(), isBot: from.is_bot };
}

bot.onText(new RegExp(`^/start(@${env.BOT_USERNAME})?$`, 'i'), (_msg) => {

});

const commands: (ChatStates['type'] | '/cancel')[] = [
    '/url_add', '/urls', '/url_del', '/cancel'
];
commands.forEach((command) => {
    bot.onText(new RegExp(`^${command}(@${env.BOT_USERNAME})?$`, 'i'), (msg) => {
        const from = vldtUser(msg);
        if (!from) return;

        const { chatId } = from;
        const state = chatStates.get(chatId);

        if (state) {
            chatStates.delete(chatId);
            bot.send({
                chatId,
                msg: `Cancel: "${state.type}"`
                    + (command === '/cancel' ? '' : `\nStart: "${command}"`)
            });
        }

        if (command === '/cancel') return;
        chatStateHandler({ ...from, type: command });
    });
});
