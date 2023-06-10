type BotActions =
    | { _t: 'send-msg' } & BotSendMsg
    | { _t: 'update-msg' } & BotUpdateMsg;

type BotSendMsg = {
    type?: 'any-msg';
    chatId?: string;
    msg: string;
} | {
    type: 'job';
    chatId?: string;
    msg: string;
    feedItemId: string;
} | {
    type: 'img';
    chatId?: string;
    /** img path */
    msg: string;
};

type BotUpdateMsg = {
    msgId: string;
    chatId: string;
    updateMsg: string;
}