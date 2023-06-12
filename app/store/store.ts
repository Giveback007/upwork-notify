import { AppState } from "./store.types";
import { readState } from "./read-write.store";


export const {
    feeds,
    chats,
    jobMsgs,
    feedItems,
}: AppState = readState();

// // -/-/- // -- bot -- // -/-/- //
// export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);
