type Chat = Required<ChatParams>;

type ChatParams = {
    feedIds?: string[];
    /** [hour-24, mins-59] */
    dayStart?: [number, number] | null;
    /** [hour-24, mins-59] */
    dayEnd?: [number, number] | null;
    dayStartMsg?: string | null;
    dayEndMsg?: string | null;
    timeZone?: string;
    type: 'private' | 'group' | 'supergroup' | 'channel';
    /** A flag to indicate if the user /start or /stop the bot */
    active?: boolean;
}
