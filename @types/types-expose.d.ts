import TelegramBot from 'node-telegram-bot-api';

declare global {
    type TelegramUser = TelegramBot.User;
    type TelegramMsg = TelegramBot.Message;
}