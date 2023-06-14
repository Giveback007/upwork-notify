/**
 * !TODO:
 * - Ensure msg was delivered before storing the corresponding feed item
 * - Allow to filter out jobs by country
 * - Analytics for each feed (hour by hour n of post by day of week)
 * - Validate is user is allowed to use the bot
 * - Proper multi user support (+ no more than 30msg per sec for all users)
 */

// -- Init -- //
import './init';

// -- Imports -- //
// import { feeds as feedsState, feedParams, bot, feedItems, jobMsgs } from './store';
// import { getFeed } from './utils/feed.utils';
// import { arrToRecord, getTime, msToTime, storeFeedItems, time } from './utils/utils';
// import { generateMessage } from './utils/msg.utils';

// -- App Start -- //
setTimeout(async () => {
    try {
        // bot.start();
        // console.log('[1]: BOT STARTED');

        // checkFeeds();
        // console.log('[2]: FEED CHECKER STARTED');

        // updateMsgs();
        // console.log('[3]: MSG TIMES-UPDATER STARTED');

        // async import the commands
        // await import('./bot/commands.bot');
        // console.log('[4]: COMMANDS INITIALIZED');

        // bot.send({ msg: '💻' });
        // bot.send({ msg: env.START_MSG });
        console.log('[Final]: APP INITIALIZED');
    } catch(error) {
        // bot.sendError(error);
        log(error);
    }
});
