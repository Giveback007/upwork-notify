type Feed = Required<FeedParams>;

type FeedParams = {
    rssUrl: string;
    /** id of chat where the feed is being sent */
    chatId: string;
    /** name for url given by user */
    name: string;
    /** id of user who added the url */
    userId: string;
    /** At which point to stop updating the job-msg */
    maxJobUpdateAge?: number;
    /** How many items to return from the feed (when pulled online from rss/atom) */
    feedItemPullCount?: 10 | 20 | 50 | 100;

    checkFreq?: number;
    itemIds?: string[];
    lastChecked?: number;
};

type FeedItem = {
    title: string;
    updated: number;
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
