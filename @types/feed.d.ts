type Feed = Required<FeedParams>;

type FeedParams = {
    rssUrl: string;

    /** id of chat where the feed is being sent */
    chatId: string;
    /** name for url given by user */
    name: string;
    /** id of user who added the url */
    userId: string;

    checkFreq?: number | null;
    items?: FeedItem[];
    lastChecked?: number;
};

type FeedItem = {
    title: string;
    updated: string;
    /** This also acts as an Id */
    linkHref: string;
    content: string;
} & FeedItemExtras;

type FeedItemExtras = {
    'Posted On': string;
    'Category': string;
    'Country': string;
    'Skills'?: string;
    'Budget'?: string;
    'Hourly Range'?: string;
    'Location Requirement'?: string;
}

type FeedCheckParams = {
    defCheckFreq: number;
    jobExpiry: number;
    dayStart: number;
    dayEnd: number;
    /** How many items to return from the feed */
    feedItemCount: 10 | 20 | 50 | 100;
}
