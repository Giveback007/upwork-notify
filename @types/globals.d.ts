type ENV = {
    isDev: boolean;

    ENV: string;

    CHAT_ID: string;

    TELEGRAM_BOT_TOKEN: string;
    BOT_USERNAME: string;
    BOT_NAME: string;

    START_MSG: string;
};

declare const env: ENV;
declare const mainFileDirectory: string;
declare const log: typeof console.log;
declare const traceLog: (...args: any[]) => void;