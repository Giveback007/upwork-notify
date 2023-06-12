import { MapState } from "./map-state.store";

export type AppState = {
    _v: number;
    chats: MapState<string, {
        feedIds: string[];
        dayStart: number;
        dayEnd: number;
        type: "private" | "group";
        /** A flag to indicate if the user /start the bot */
        started: boolean;
    }>;
    /** The hash id is generated with the feed Atom Link */
    feeds: MapState<string, Feed>;
    /** Msgs that the bot sent */
    jobMsgs: MapState<string, {
        chatId: string;
        msgId: string;
        date: number;
        feedItemId: string;
    }>;
    feedItems: MapState<string, FeedItem>;
}