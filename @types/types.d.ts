type ENV = {
    isDev: boolean;

    ENV: string;
    UPWORK_LINK: string;

    CHAT_ID: string;
    // TELEGRAM_GROUP_ID: string;
    // BOT_DEV_ID: string;

    TELEGRAM_BOT_TOKEN: string;
    BOT_USERNAME: string;
    BOT_NAME: string;

    START_MSG: string;
};

declare const env: ENV;
declare const mainFileDirectory: string;
declare const log: typeof console.log;
declare const traceLog: (...args: any[]) => void;

type BotSendOpt = { chatId?: string, type?: 'MD', msgId?: string };

type AppState = {
    atomURL: AtomURL | null;
    timeParams: TimeParams;
}

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

type AtomURL = {
    url: string;
    lastChecked: number;
}

type AnyObj = {
    [key: string]: any;
};



// -- TUPELIFY -- //
type UnionToIntersection<U> = (
    U extends never ? never : (arg: U) => never
) extends (arg: infer I) => void ? I : never;
  
type UnionToTuple<T> = UnionToIntersection<
    T extends never ? never : (t: T) => T
> extends (_: never) => infer W
    ? [...UnionToTuple<Exclude<T, W>>, W]
    : [];

type TupleKeys<T> = UnionToTuple<keyof T>;