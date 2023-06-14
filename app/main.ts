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
import { bot, chats } from './store/store';
import { writeFile } from './utils/utils';
import { botCmds } from './bot/commands.bot';
// import { getFeed } from './utils/feed.utils';
// import { arrToRecord, getTime, msToTime, storeFeedItems, time } from './utils/utils';
// import { generateMessage } from './utils/msg.utils';

// log(cleanStack());

// -- App Start -- //
setTimeout(async () => {
    try {
        // Write the commands to a file to share with "BotFather"
        writeFile('../bot-commands', Object.entries(botCmds).reduce((acc, [cmd, description]) => {
            acc += `${cmd.slice(1)} - ${description}\n`;
            return acc;
        }, ''));

        bot.start().then(() => log('[*] BOT INITIALIZED'));
        console.log('[1]: BOT STARTING...');

        // checkFeeds();
        // console.log('[2]: FEED CHECKER STARTED');

        // updateMsgs();
        // console.log('[3]: MSG TIMES-UPDATER STARTED');

        // async import the commands
        await import('./bot/commands.bot');
        console.log('[4]: COMMANDS INITIALIZED');

        
        chats.forEach((chat, chatId) => {
            // log(chatId, chat)
            // const { dayStart, dayEnd, timeZone } = chat;
            // bot.sendMsg(chatId, '💻');

            // if (dayStart) new CronJob(`${dayStart[1]} ${dayStart[0]} * * *`, () => {

            // }, null, false, timeZone);

            // if (dayEnd) new CronJob(`${dayEnd[1]} ${dayEnd[0]} * * *`, () => {
                    
            // });
        });

        console.log('[Final]: APP INITIALIZED');
    } catch(error) {
        log(error);
    }
});
