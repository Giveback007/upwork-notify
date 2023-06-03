type ENV = {
    UPWORK_LINK: string;
};

declare const env: ENV;
declare const mainFileDirectory: string;
declare const log: typeof console.log;

type Feed = {
    updated: string;
    rssUrl: string;
    items: FeedItem[];
}

type FeedItem = {
    id: string;
    title: string;
    updated: string;
    linkHref: string;
    content: string;
    extras: {
        'Posted On': string;
        'Category': string;
        'Country': string;
        'Skills'?: string;
        'Budget'?: string;
        'Hourly Range'?: string;
        'Location Requirement'?: string;
    }
    // age: {
    //     h: number;
    //     m: number;
    //     string: string;
    // };
};
