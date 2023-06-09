import { readJSON, time, writeJSON } from "./utils/utils";
import { MapState, ObjState, State } from "./utils/state.utils";
import type { Message } from "node-telegram-bot-api";
import { Bot } from "./bot/bot";
import { hashString } from "./utils/string.utils";

export type AppState = {
    _v: 1;
    feedParams: FeedCheckParams;
    feeds: {
        /** The hash id is generated with the feed Atom Link */
        [hashId: string]: Feed;
    };
    /** Msgs that the bot sent */
    jobMsgs: { [feedItemId: string]: Message };
}

/** When the state structure changes this number will be changed */
const stateVersion = 1;
const statePath = `../data/state-v${stateVersion}.json`;

function writeState(update: Partial<AppState>) {
    const state = readJSON<AppState>(statePath) || {} as AppState;
    writeJSON(statePath, { ...state, ...update });
}

/**
 * Reads the state file and returns the state object.
 * If the state file does not exist or the state version
 * is deprecated, default will be used.
 */
function readState(): AppState {
    let state = readJSON<AppState>(statePath);

    if (!state || state._v !== stateVersion) {
        // Default state
        state = {
            _v: stateVersion,
            feedParams: {
                defCheckFreq: time.min(20),
                jobExpiry: time.hrs(3),
                dayStart: 7,
                dayEnd: 22,
                feedItemCount: 20,
            },
            feeds: {},
            jobMsgs: {},
        };

        writeState(state);
    };

    return state;
}

const defState: AppState = readState();

// -/-/- // -- bot -- // -/-/- //
export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

// -/-/- // -- feeds -- // -/-/- //
export const feeds = new ObjState(defState.feeds);
feeds.on('change', (feeds) => writeState({ feeds }));

export const hashId = (url: string) => hashString(url, 'md5');

// -/-/- // -- timeParams -- // -/-/- //
export const feedParams = new State(defState.feedParams);
feedParams.on('change', (timeParams) => writeState({ feedParams: timeParams }));

// -/-/- // -- botMsgs -- // -/-/- //
export const jobMsgs = new ObjState(defState.jobMsgs);
jobMsgs.on('change', (botMsgs) => writeState({ jobMsgs: botMsgs }));

// -/-/- // -- feedItems -- // -/-/- //
export const feedItems = new MapState<string, FeedItem>();
feeds.on('change', (feeds) => {
    Object.values(feeds).forEach((feed) => feed.items.forEach((item) => {
        feedItems.update(item.linkHref, item);
    }));
});
