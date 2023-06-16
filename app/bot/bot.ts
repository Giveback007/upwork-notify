import TelegramBot from 'node-telegram-bot-api';
import { splitUpString } from '../utils/string.utils';
import { feedItems, jobMsgs } from '../store/store';
import { generateMessage } from '../utils/msg.utils';
import { Scheduler } from './scheduler.bot';
import { users } from '../store/store';
import { wait } from '../utils/time.utils';

const msgLimit = 4096;

const addPartInfo = (msg: string) => splitUpString(msg, msgLimit - 36)
    .map((msgPart, index, { length }) => `(${index+1}/${length}) ${msgPart}` as string);

const addEllipsis = (msg: string) => msg.length > msgLimit ? msg.slice(0, msgLimit - 3) + '...' : msg;

const toSplitMsgs = (msg: string) => msg.length > msgLimit ? addPartInfo(msg) : [msg];

// https://t.me/${env.BOT_USERNAME}
export class Bot {
    private scheduler = new Scheduler();
    private bot: TelegramBot;
    private _botInfo: TelegramBot.User | null = null;
    
    get username() {
        return this._botUsername;
    }

    constructor(
        apiKey: string,
        /** Make sure to provide the full username with the "@" at the beginning */
        private _botUsername: string,
    ) {
        this.bot = new TelegramBot(apiKey);
        this.bot.getMe().then(info => this._botInfo = info);

        if (this._botUsername[0] !== '@')
            this._botUsername = '@' + this._botUsername;
    }

    start = () => this.bot.startPolling();
    stop = () => this.bot.stopPolling();

    getBot() {
        return this.bot;
    }

    async getBotInfo() {
        while (!this._botInfo) await wait(100);
        return this._botInfo;
    }

    /**
     * If the msg is too long it will be split into multiple msgs,
     * that's why an array of results is returned */
    sendMsg = async (chatId: string, msg: string) =>
    {
        const promises = toSplitMsgs(msg).map(async msg =>
            this.scheduler.toQue(chatId, () => this.bot.sendMessage(chatId, msg, {
                disable_web_page_preview: true,
            }))
        );

        const result = await Promise.all(promises);
        const allOk = result.every(({ ok }) => ok);

        if (!allOk) {
            if (env.isDev) debugger;
            console.log('failed', result);
        }

        const val = (result.filter(({ ok }) => ok) as {
            ok: true;
            out: TelegramMsg;
        }[]).map(({ out }) => out);

        return allOk ? {
            ok: true,
            val,
        } : {
            ok: false,
            val,
            err: (result.filter(({ ok }) => !ok) as {
                ok: false;
                out: any;
            }[]).map(({ out }) => out),
        }
    }

    updateJobMsg = async (jobMsgId: string, lastMsgTime?: number) =>
    {
        const now = Date.now();

        const jobMsg = jobMsgs.get(jobMsgId);
        if (!jobMsg) return log(`No message found with id ${jobMsgId}`);

        const feedItem = feedItems.get(jobMsg.feedItemId);
        if (!feedItem) return log(`Feed item not found: ${jobMsg.feedItemId}`);

        const updateMsg = addEllipsis(generateMessage(feedItem));

        return this.scheduler.toQue(jobMsg.chatId, () => this.bot.editMessageText(updateMsg, {
            chat_id: jobMsg.chatId,
            message_id: Number(jobMsg.msgId),
            disable_web_page_preview: true
        })).then(res => {
            if (res.ok && lastMsgTime && lastMsgTime < now) jobMsgs.delete(jobMsgId);
            return res;
        });
    }

    sendImg = async (chatId: string, imgPath: string) =>
    {
        return this.scheduler.toQue(chatId, () => this.bot.sendPhoto(chatId, imgPath));
    }

    sendJob = async (chatId: string, feedItemId: string) =>
    {
        const feedItem = feedItems.get(feedItemId);
        if (!feedItem) return log(`Feed item not found: ${feedItemId}`);

        const msg = addEllipsis(generateMessage(feedItem));
        const res = await this.sendMsg(chatId, msg);
        
        if (res.ok) {
            const jobMsgId = this.genMsgId(chatId, feedItemId);
            // we should only have one message
            const out = res.val[0]!;

            jobMsgs.set(jobMsgId, {
                chatId,
                msgId: out.message_id,
                date: out.date * 1000,
                feedItemId,
            });

            return { ok: true, out } as const;
        } else {
            return { ok: false, out: res.err! } as const;
        }
    }

    genMsgId = (chatId: string | number, msgId: string | number) => `${chatId}-${msgId}`;

    validateUser = (from?: TelegramUser) =>
        Boolean(from?.username && users.get(from.username)?.isActive);
}
