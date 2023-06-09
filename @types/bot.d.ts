type BotActions =
    | BotSendMsg
    | BotUpdateMsg;

type BotSendMsg = ({
    type?: 'any-msg';
} | {
    type: 'job';
    feedItemId: string;
}) & {
    _t: 'send-msg';
    msg: string;
    chatId?: string;
};

type BotUpdateMsg = {
    _t: 'update-msg';
    msgId: number | string;
    msg: string;
}