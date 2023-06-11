import { readJSON, time, writeJSON } from "./utils/utils";
import { MapState, ObjState, State } from "./utils/state.utils";
import { Bot } from "./bot/bot";

/** When the state structure changes this number will be changed */
const stateVersion = 2;
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
                dayStart: 7,
                dayEnd: 22,
                feedItemCount: 20,
                maxJobAge: time.hrs(3),
            },
            feeds: {},
            jobMsgs: {},
            // chatParams: {},
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

// -/-/- // -- timeParams -- // -/-/- //
export const feedParams = new State(defState.feedParams);
feedParams.on('change', (timeParams) => writeState({ feedParams: timeParams }));

// -/-/- // -- botMsgs -- // -/-/- //
export const jobMsgs = new ObjState(defState.jobMsgs);
jobMsgs.on('change', (botMsgs) => writeState({ jobMsgs: botMsgs }));

// -/-/- // -- feedItems -- // -/-/- //
export const feedItems = new MapState<string, FeedItem>();
Object.values(feeds.get()).forEach((feed) => feed.items.forEach((item) => {
    feedItems.update(item.linkHref, item);
}));

feeds.on('change', (feeds) => {
    Object.values(feeds).forEach((feed) => feed.items.forEach((item) => {
        feedItems.update(item.linkHref, item);
    }));
});
