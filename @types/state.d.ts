type AppState = {
    _v: 1;
    feedParams: FeedCheckParams;
    feeds: {
        /** The hash id is generated with the feed Atom Link */
        [hashId: string]: Feed;
    };
    /** Msgs that the bot sent */
    jobMsgs: { [chatId_msgId: string]: {
        chatId: string,
        msgId: string,
        date: number,
        feedItemId: string,
    } };
}