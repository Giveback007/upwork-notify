import { AppState } from "./store.types";
import { readState, writeState } from "./read-write.store";
import { Bot } from "../bot/bot";
import { MapState } from "./map-state.store";
import { State } from "./state.store";
import { CronJob, CronTime } from "cron";

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

// -/-/- // -- Cron Jobs -- // -/-/- //
type ChatCron = { dayStart?: CronJob; dayEnd?: CronJob; };
const dayStartEndMsgs: { [chatId: string]: ChatCron } = {}

function updateCronJobs(chatId: string, chat: Chat | null)
{
    const chatCron: ChatCron = dayStartEndMsgs[chatId] = dayStartEndMsgs[chatId] || {};
    if (!chat || !chat.active) {
        chatCron.dayStart?.stop();
        chatCron.dayEnd?.stop();

        return;
    };

    const { active, dayEnd, dayStart, dayEndMsg, dayStartMsg, timeZone } = chat;

    // If dayStart time is defined
    if (dayStart)
    {
        const [hour, minute] = dayStart;
        const cronTime = `${minute} ${hour} * * *`;

        if (chatCron.dayStart)
        {
            const cronJob = chatCron.dayStart;
            cronJob.setTime(new CronTime(cronTime, timeZone));

            if (active) cronJob.start();
            else cronJob.stop();
        }
        else
        {
            const newCronJob = new CronJob(cronTime, () =>
            {
                bot.sendMsg(chatId, '🌞');
                if (dayStartMsg) bot.sendMsg(chatId, dayStartMsg);
            }, null, active, timeZone);

            chatCron.dayStart = newCronJob;
        }
    }

    // Similar for dayEnd
    if (dayEnd)
    {
        const [hour, minute] = dayEnd;
        const cronTime = `${minute} ${hour} * * *`;

        if (chatCron.dayEnd)
        {
            const cronJob = chatCron.dayEnd;
            cronJob.setTime(new CronTime(cronTime, timeZone));

            if (active) cronJob.start();
            else cronJob.stop();
        }
        else
        {
            const newCronJob = new CronJob(cronTime, () =>
            {
                bot.sendMsg(chatId, '🌛');
                if (dayEndMsg) bot.sendMsg(chatId, dayEndMsg);
            }, null, active, timeZone);

            chatCron.dayEnd = newCronJob;
        }
    }
}

chats.forEach((chat, chatId) => updateCronJobs(chatId, chat));
chats.on('change', () => {
    Object.keys(dayStartEndMsgs).forEach((chatId) => {
        if (chats.get(chatId)) return;
        updateCronJobs(chatId, null);
    });

    chats.forEach((chat, chatId) => updateCronJobs(chatId, chat))
});
