import { AppState } from "./store.types";
import { readState, writeState } from "./read-write.store";
import { Bot } from "../bot/bot";
import { MapState } from "./map-state.store";
import { State } from "./state.store";
import { UserState } from "./user-state.store";
import { time } from "../utils/time.utils";
import { filterFeedItems } from "../feed";
import { readJSON, writeJSON } from "../utils/utils";

// -/-/- // -- appState -- // -/-/- //
const appState: AppState = readState();
writeState(appState);

export const {
    feeds,
    chats,
    jobMsgs,
    feedItems,
    users,
}: AppState = appState;

// -/-/- // -- state change listeners -- // -/-/- //
(Object.keys(appState) as (keyof AppState)[]).forEach((key) => {
    const item: any = appState[key];
    if (item instanceof UserState || item instanceof MapState || item instanceof State)
        item.on('change', () => writeState({ [key]: item }));
});

// -/-/- // -- clean up old data -- // -/-/- //
(function cleanUpOld() {
    if (env.env === 'test') return;
    
    feeds.forEach((fd, id) => !chats.has(fd.chatId) && feeds.delete(id));

    const oldItems = filterFeedItems({ minAge: Date.now() - time.hrs(3) });
    oldItems.forEach(([id]) => feedItems.delete(id));

    chats.forEach((chat, chatId) => {
        const sentIds = new Set(chat.idsOfSentFeedItems);
        sentIds.forEach(id => !feedItems.has(id) && sentIds.delete(id));
        
        const feedIds = new Set(chat.feedIds);
        feedIds.forEach(id => !feeds.has(id) && feedIds.delete(id))

        chats.set(chatId, {
            ...chat,
            idsOfSentFeedItems: Array.from(sentIds),
            feedIds: Array.from(feedIds),
        });
    });

    jobMsgs.forEach((msg, id) => !chats.has(msg.chatId) && jobMsgs.delete(id));

    setTimeout(cleanUpOld, time.min(30));
})();

// -/-/- // -- bot -- // -/-/- //
export const bot = new Bot(env.bot.token, env.bot.username);


export function storeFeedItems(feedId: string, newFeedItems: FeedItem[])
{
    const filePath = `../data/feeds/${feedId}.json`;

    const oldItems = readJSON<Record<string, FeedItem>>(filePath) || {};
    newFeedItems.forEach((item) => {
        oldItems[item.linkHref] = item;
        feedItems.set(item.linkHref, item);
    });

    writeJSON(filePath, oldItems);
}
