import TelegramBot from 'node-telegram-bot-api';
import { splitUpString } from '../utils/string.utils';
import { feedItems, jobMsgs } from '../store/store';
import { generateMessage } from '../utils/msg.utils';
import { Scheduler } from './scheduler.bot';
import { users } from '../store/store';


const addPartInfo = (msg: string) => splitUpString(msg, 4060)
    .map((msgPart, index, { length }) => `(${index+1}/${length}) ${msgPart}` as string);

const addEllipsis = (msg: string) => msg.slice(0, 4093) + '...';

const toSplitMsgs = (msg: string) => msg.length > 4096 ? addPartInfo(msg) : [msg];

// https://t.me/${env.BOT_USERNAME}
export class Bot {
    private scheduler = new Scheduler();
    private bot: TelegramBot;
    
    get username() {
        return this._botUsername;
    }

    constructor(
        apiKey: string,
        /** Make sure to provide the full username with the "@" at the beginning */
        private _botUsername: string,
    ) {
        this.bot = new TelegramBot(apiKey);

        if (this._botUsername[0] !== '@')
            this._botUsername = '@' + this._botUsername;
    }

    start = () => this.bot.startPolling();
    stop = () => this.bot.stopPolling();

    getBot() {
        return this.bot;
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

        if (!allOk)
            console.log('failed', result);

        const val = (result.filter(({ ok }) => ok) as {
            ok: true;
            out: TelegramBot.Message;
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

    sendJob = async (chatId: string, feedItemId: string) =>
    {
        const feedItem = feedItems.get(feedItemId);
        if (!feedItem) return log(`Feed item not found: ${feedItemId}`);

        const msg = addEllipsis(generateMessage(feedItem));
        const res = await this.sendMsg(msg, chatId);
        
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

    sendImg = async (chatId: string, imgPath: string) =>
    {
        return this.scheduler.toQue(chatId, () => this.bot.sendPhoto(chatId, imgPath));
    }

    update = async (chatId: string, msgId: string, updateMsg: string) =>
    {
        const jobMsg = jobMsgs.get(this.genMsgId(chatId, msgId));
        if (!jobMsg) return log(`No message found with id ${msgId}`);

        return this.scheduler.toQue(chatId, () => this.bot.editMessageText(updateMsg, {
            chat_id: chatId,
            message_id: Number(jobMsg.msgId),
            disable_web_page_preview: true
        }));
    }

    genMsgId = (chatId: string | number, msgId: string | number) => `${chatId}-${msgId}`;

    validateUser = (from?: TelegramBot.User) =>
    {
        if (!from) return false;
        const userId = from.id.toString();
        const user = users.get(userId);

        return !!user;
    }
}
