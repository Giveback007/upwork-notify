import TelegramBot from 'node-telegram-bot-api';
import { time } from '../utils/utils';
import { splitUpString } from '../utils/string.utils';
import { jobMsgs } from '../store';

const addPartInfo = (msg: string) => splitUpString(msg, 4089)
    .map((msgPart, index, { length }) => `(${index+1}/${length}) ${msgPart}`);

// https://t.me/${env.BOT_USERNAME}
export class Bot extends TelegramBot {
    private actions: BotActions[] = [];

    send = (opt: Omit<BotSendMsg, '_t'>) =>
    {
        const obj = { ...opt, _t: 'send-msg' } as BotSendMsg;
        const { msg } = obj;

        const splitMsgs =
            msg.length > 4096 ? addPartInfo(msg) : [msg];

        splitMsgs.forEach(msg => this.actions.push({
            ...opt, msg, _t: 'send-msg'
        } as BotSendMsg));

        this.startRateLimiter();
    }

    update = (opt: Omit<BotUpdateMsg, '_t'>) =>
    {
        this.actions.push({ ...opt, _t: 'update-msg' });
        this.startRateLimiter();
    }

    sendError = (error: Error | string, chatId: string = env.CHAT_ID) =>
    {
        if (typeof error === 'string') error = new Error(error);
        this.send({msg: `Error: ${error.message}`, chatId });
    }

    start = () =>
    {
        this.startPolling();
    }

    stop = () =>
    {
        this.stopPolling();
    }

    private isSending = false;
    private msgTimings: number[] = [];
    private lastMsgTime = 0;
    private readonly msgTiming = time.sec(1.5);
    private readonly msgClrTime = time.min(1.1);
    private readonly maxMsgs = env.isDev ? 10 : 20;
    private startRateLimiter = async () =>
    {
        if (this.actions.length === 0 || this.isSending) return;
        
        // Remove timings older than 1 minute
        const now = Date.now();
        this.msgTimings = this.msgTimings.filter(n => n > now - this.msgClrTime);

        if (this.msgTimings.length >= this.maxMsgs || this.lastMsgTime > now - this.msgTiming) {
            setTimeout(this.startRateLimiter, this.msgTiming);
            return;
        }

        const act = this.actions.shift()!;
        switch (act._t) {
            case 'send-msg':
                await this.executeSend(act);
                break;
            case 'update-msg':
                await this.executeUpdate(act);
                break;
            default:
                throw new Error(`Unhandled action type: ${(act as any)._t}`);
        }
        
        setTimeout(this.startRateLimiter, this.msgTiming);
    }

    private executeSend = async (obj: BotSendMsg) =>
    {
        const { chatId = env.CHAT_ID, msg, ...rest } = obj;

        try {
            this.isSending = true;

            const botMsg = await this.sendMessage(chatId, msg, {
                // parse_mode: type === 'MD' ? 'MarkdownV2' : undefined,
                disable_web_page_preview: true
            });

            // Update job message
            if (rest.type === 'job') {
                jobMsgs.update({ [rest.feedItemId]: botMsg });
            }
        } catch (err) {
            log(err);
        } finally {
            const now = Date.now();
            this.isSending = false;
            this.lastMsgTime = now;
            this.msgTimings.push(now);
        }
    }

    private executeUpdate = async (obj: BotUpdateMsg) => {
        const { msgId, msg } = obj;
        const msgs = jobMsgs.get();
        const x = msgs[msgId];
        if (!x) return log(`No message found with id ${msgId}`);

        const { chat, message_id } = x;

        // now update the message via the telegram bot api
        try {
            await this.editMessageText(msg, {
                chat_id: chat.id,
                message_id: message_id,
                disable_web_page_preview: true
            });
        } catch (err) {
            log(err);
        }
    }
}