import TelegramBot from 'node-telegram-bot-api';
import { atomURL } from './store';
import { joinMain, time } from './utils/utils';

// https://t.me/${env.BOT_USERNAME}
const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN);

export const Bot = new class Bot {
    private messages: ({ msg: string } & BotSendOpt)[] = [];

    send = (opt: { msgs: string | string[] } & BotSendOpt) =>
    {
        let { msgs, chatId, type } = opt;

        if (typeof msgs === 'string') msgs = [msgs];

        msgs.forEach(msg => {
            if (msg.length > 4096) {
                const msgs = msg.match(/.{1,4089}/g); // Split to less: 4096 - 7 for (1/3) part = 4089
                if (msgs) {
                    msgs.forEach((msgPart, index) => {
                        // Adding the message part information
                        msg = `(${index+1}/${msgs.length}) ${msgPart}`;
                        this.messages.push({ chatId, msg, type });
                    });
                }
            } else {
                this.messages.push({ chatId, msg, type });
            }
        });
    
        this.sendMessages();
    }

    sendError = (error: Error, chatId: string = env.CHAT_ID) =>
    {
        this.send({msgs: `Error: ${error.message}`, chatId});
    }

    start = () =>
    {
        bot.startPolling();
    }

    stop = () =>
    {
        bot.stopPolling();
    }

    private isSending = false;
    private msgTimings: number[] = [];
    private lastMsgTime = 0;
    private readonly msgTiming = time.sec(env.isDev ? 1 : 2);
    private readonly msgClrTime = time.min(1.1);
    private readonly maxMsgs = env.isDev ? 5 : 20;
    private sendMessages = async () =>
    {
        if (this.messages.length === 0 || this.isSending) return;
        
        // Remove timings older than 1 minute
        const now = Date.now();
        this.msgTimings = this.msgTimings.filter(n => n > now - this.msgClrTime);

        if (this.msgTimings.length >= this.maxMsgs || this.lastMsgTime > now - this.msgTiming) {
            setTimeout(this.sendMessages, this.msgTiming);
            return;
        }
        
        try {
            const { chatId = env.CHAT_ID, msg, type } = this.messages.shift()!;
            this.isSending = true;

            await bot.sendMessage(chatId, msg, {
                parse_mode: type === 'MD' ? 'MarkdownV2' : undefined,
                disable_web_page_preview: true
            });
        } catch (err) {
            log(err);
        }finally {
            const now = Date.now();
            this.isSending = false;
            this.lastMsgTime = now;
            this.msgTimings.push(now);
        }

        setTimeout(this.sendMessages, this.msgTiming);
    }
}

// --- // COMMANDS // --- //
bot.onText(/\/url( .+)?/, async (msg, match) => {
    const id = msg.chat.id.toString();
    if (
        // Ignore messages older than 1 minute
        msg.date < (Date.now() / 1000) - 60
        ||
        // Only allow the corresponding chat id
        id !== env.CHAT_ID
    ) return;

    const chatId = msg.chat.id;
    const url = match?.[1]?.trim() || '';

    if (!url.includes('https://www.upwork.com/ab/feed/jobs/atom')) {
        bot.sendMessage(chatId, `Please give a valid 'ATOM' link`);
        bot.sendMessage(chatId, `Go here to get one:\nhttps://www.upwork.com/nx/jobs/search/`);
        bot.sendPhoto(chatId, joinMain('../assets/example-1.png'));
        return;
    }
  
    atomURL.set({ url, lastChecked: 0 });
});

// bot.onText(/\/setFreq/, async (msg) => {

