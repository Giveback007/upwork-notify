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
    // age: {
    //     h: number;
    //     m: number;
    //     string: string;
    // };
};
