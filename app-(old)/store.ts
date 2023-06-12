import { readJSON, time, wait, writeJSON } from "./utils/utils";
import { MapState, State } from "./utils/state.utils";
import { Bot } from "./bot/bot";
import { isType } from "./utils/test.utils";

/** When the state structure changes this number will be changed */
const stateVersion = 2;
const statePath = `../data/state-v${stateVersion}.json`;

type StateWrapper<T> = {
    [K in keyof T]: T[K] extends Map<infer MK, infer MV>
        ? { t: 'Map', v: [MK, MV][] }
        : { t: 'any', v: T[K] }
};

type WrappedState = StateWrapper<AppState>;

async function writeState(update: Partial<AppState>) {
    type K = keyof AppState;
    await wait(0);

    const oldState: WrappedState = readJSON(statePath) || {} as any;
    const newState: Partial<WrappedState> = {};

    const keys = {
        Map: (val: Map<any, any>) => Array.from(val.entries()),
        Set: (val: Set<any>) => Array.from(val.values()),
        Date: (val: Date) => val.toISOString(),
    }

    for (const key in update) {
        const value = update[key as K];
        
        if (isType(value, 'Map')) {
            newState[key as K] = { t: 'Map', v: Array.from(value.entries()) } as any;
        } else {
            newState[key as K] = { t: 'any', v: value } as any;
        }
    }

    writeJSON(statePath, { ...oldState, ...newState });
}

/**
 * Reads the state file and returns the state object.
 * If the state file does not exist or the state version
 * is deprecated, default will be used.
 */
function readState(): AppState {
    // 1. Read JSON
    // 2. Converts Array of Entries to Map()
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
