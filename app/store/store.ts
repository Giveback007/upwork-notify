import { AppState } from "./store.types";
import { readState } from "./read-write.store";
import { Bot } from "../bot/bot";


export const {
    feeds,
    chats,
    jobMsgs,
    feedItems,
    users,
}: AppState = readState();

// -/-/- // -- bot -- // -/-/- //
export const bot = new Bot(env.bot.token, env.bot.username);
