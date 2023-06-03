import './init.js';
import TelegramBot from 'node-telegram-bot-api';
import * as path from 'path';

// https://t.me/${env.BOT_USERNAME}
const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.onText(/\/url( .+)?/, (msg, match) => {
    const id = msg.chat.id.toString();
    if (
        id !== env.TELEGRAM_GROUP_ID
        &&
        id !== env.BOT_OWNER_ID
    ) return;

    const chatId = msg.chat.id;
    const url = match?.[1]?.trim() || '';
    log(url);
  
    // if (!url.includes('https://www.upwork.com/ab/feed/jobs/atom')) {
    //     bot.sendMessage(chatId, `Please give a valid 'ATOM' link`);
    //     bot.sendMessage(chatId, `Go here to get one:\nhttps://www.upwork.com/nx/jobs/search/`);
    //     bot.sendPhoto(chatId, path.join(mainFileDirectory, '../assets/example-1.png'));
    //     return;
    // }
  
    // TODO: Validate that the URL is a valid Upwork RSS feed
  
    // TODO: Store the URL in your server's database
    
    bot.sendMessage(chatId, 'URL has been set successfully');
});
