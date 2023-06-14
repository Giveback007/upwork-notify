type Chat = Required<ChatParams>;

type ChatParams = {
    feedIds?: string[];
    dayStart?: [number, number];
    dayEnd?: [number, number];
    dayStartMsg?: string | null;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    /** A flag to indicate if the user /start or /stop the bot */
    active?: boolean;
}
