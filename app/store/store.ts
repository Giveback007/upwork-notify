import { AppState } from "./store.types";
import { readState, writeState } from "./read-write.store";
import { Bot } from "../bot/bot";
import { MapState } from "./map-state.store";
import { State } from "./state.store";


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
Object.keys(appState).forEach((key) => {
    const item = (appState as any)[key];
    if (item instanceof MapState || item instanceof State)
        item.on('change', () => writeState({ [key]: item }));
});

// -/-/- // -- bot -- // -/-/- //
export const bot = new Bot(env.bot.token, env.bot.username);

// -/-/- // -- dayStartEndMsgs -- // -/-/- //
export const dayStartEndMsgs = {

}
