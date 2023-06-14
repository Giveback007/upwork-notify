import TelegramBot, { Message } from 'node-telegram-bot-api';
import { time, wait } from '../utils/utils';
import { splitUpString } from '../utils/string.utils';
import { feedItems, jobMsgs } from '../store/store';
import { generateMessage } from '../utils/msg.utils';
import { Scheduler } from './scheduler.bot';


const addPartInfo = (msg: string) => splitUpString(msg, 4060)
    .map((msgPart, index, { length }) => `(${index+1}/${length}) ${msgPart}`);

const addEllipsis = (msg: string) => msg.slice(0, 4093) + '...';

const toSplitMsgs = (msg: string) => msg.length > 4096 ? addPartInfo(msg) : [msg];

// https://t.me/${env.BOT_USERNAME}
export class Bot extends TelegramBot {
    //private que: { chatId: string; promise: ReturnType<typeof createPromise> }[] = [];
    private scheduler = new Scheduler();

    sendMsg = async (chatId: string, msg: string) =>
    {
        const promises = toSplitMsgs(msg).map(async msg =>
            this.scheduler.toQue(chatId, () => this.sendMessage(chatId, msg, {
                disable_web_page_preview: true,
            }))
        );

        const result = await Promise.all(promises);

        // const didSucceed = result.every(({ status }) => status === 'fulfilled');
        // const type = didSucceed ? 'success' : 'error';

        // const fulfilledValues = result
        //     .filter((res): res is PromiseFulfilledResult<Message> => res.status === 'fulfilled')
        //     .map((res) => res.value);

        // const rejectedReasons = result
        //     .filter((res): res is PromiseRejectedResult => res.status === 'rejected')
        //     .map((res) => res.reason);

        if (!didSucceed) {
            const failed = result.filter(({ status }) => status === 'rejected');
            console.log('failed', failed);
        }

        return { type, result: { fulfilledValues, rejectedReasons } } as const;
    }

    sendJob = async (chatId: string, feedItemId: string) => {
        const feedItem = feedItems.get(feedItemId);
        if (!feedItem) return log(`Feed item not found: ${feedItemId}`);

        const msg = addEllipsis(generateMessage(feedItem));
        const { type, result: res } = await this.sendMsg(msg, chatId);
        
        if (type === 'success') {
            const jobMsgId = this.genMsgId(chatId, feedItemId);
            const result = res.fulfilledValues[0]!;

            jobMsgs.set(jobMsgId, {
                chatId,
                msgId: result.message_id,
                date: result.date * 1000,
                feedItemId,
            });

            return { type, result };
        } else {
            return { type, error: res.rejectedReasons[0] };
        }
    }

    sendImg = async (chatId: string, imgPath: string) => {
        // const promise = createPromise();
        // this.que.push({ chatId, promise });
        // await promise.promise;
        this.scheduler.toQue(chatId, () => this.sendPhoto(chatId, imgPath));

        try {
            const result = await this.sendMessage(chatId, imgPath, {
                disable_web_page_preview: true,
            });
    
            return { type: 'success', result } as const;
        } catch (error) {
            return { type: 'error', result: error } as const;
        }
    }

    update = async (chatId: string, msgId: string, updateMsg: string) =>
    {
        const jobMsg = jobMsgs.get(this.genMsgId(chatId, msgId));
        if (!jobMsg) return log(`No message found with id ${msgId}`);

        const promise = createPromise();
        this.que.push({ chatId, promise });
        await promise.promise;

        try {
            const result = await this.editMessageText(updateMsg, {
                chat_id: chatId,
                message_id: Number(jobMsg.msgId),
                disable_web_page_preview: true
            });
        } catch (error) {

        }



        // now update the message via the telegram bot api
        // try {
        //     await this.editMessageText(updateMsg, {
        //         chat_id: chatId,
        //         message_id: Number(jobMsg.msgId),
        //         disable_web_page_preview: true
        //     });
        // } catch (err) {
        //     log(err);
        // }
    }

    // sendError = (error: Error | string, chatId) =>
    // {
    //     if (typeof error === 'string') error = new Error(error);
    //     this.send({msg: `Error: ${error.message}`, chatId });
    // }

    // start = () =>
    // {
    //     this.startPolling();
    // }

    // stop = () =>
    // {
    //     this.stopPolling();
    // }

    genMsgId = (chatId: string | number, msgId: string | number) => `${chatId}-${msgId}`;

    // a method for validating the chatId (if the user or group is allowed to use the bot)
    private validateChatId = (chatId: string | number) => {
        chatId = chatId.toString();
        

    }

    // private executeSend = async (obj: BotSendMsg) =>
    // {
    //     const { chatId = env.CHAT_ID, msg, ...rest } = obj;

    //     try {
    //         if (obj.type === 'img') {
    //             await this.sendPhoto(chatId, msg);
    //             return;
    //         }

    //         const { message_id, date } = await this.sendMessage(chatId, msg, {
    //             // parse_mode: type === 'MD' ? 'MarkdownV2' : undefined,
    //             disable_web_page_preview: true
    //         });

    //         // Update job message
    //         if (rest.type === 'job') {
    //             jobMsgs.update({ [this.genMsgId(chatId, message_id)]: {
    //                 chatId,
    //                 msgId: message_id.toString(),
    //                 date: date * 1000,
    //                 feedItemId: rest.feedItemId,
    //             } });
    //         }
    //     } catch (err) {
    //         log(err);
    //     } finally {
    //         const now = Date.now();
    //         this.lastMsgTime = now;
    //         this.msgTimings.push(now);
    //     }
    // }

    // private executeUpdate = async (obj: BotUpdateMsg) => {
    //     const { msgId, updateMsg, chatId } = obj;
    //     const jobMsgsData = jobMsgs.get();
    //     const jobMsg = jobMsgsData[this.genMsgId(chatId, msgId)];
    //     if (!jobMsg) return log(`No message found with id ${msgId}`);

    //     // now update the message via the telegram bot api
    //     try {
    //         await this.editMessageText(updateMsg, {
    //             chat_id: chatId,
    //             message_id: Number(jobMsg.msgId),
    //             disable_web_page_preview: true
    //         });
    //     } catch (err) {
    //         log(err);
    //     }
    // }
}
