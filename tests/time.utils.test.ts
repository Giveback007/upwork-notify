import { expect } from 'chai';
import { chatStartEndDates, getMsTzOffset, getUtcDayStartEnd, time } from '../app/utils/time.utils';

type Chat = {
    timeZone: string;
    dayStart: number[];
    dayEnd: number[];
};

describe('chatStartEndDates', () =>
{
    const tExpected = (now: number, chat: Chat) =>
    {
        const { timeZone } = chat;
        const day = getUtcDayStartEnd(now);
        const msOffset = getMsTzOffset(timeZone, now);
        const localStart = day.start - msOffset;

        const { dayStart, dayEnd } = chat;
        const start = localStart + time.hrs(dayStart[0]) + time.min(dayStart[1]);
        const end = localStart + time.hrs(dayEnd[0]) + time.min(dayEnd[1]);
        
        return { start, end };
    }

    it('should return the correct start, end, and isDayEnd values', () =>
    {
        const chat = {
            timeZone: 'America/New_York',
            dayStart: [9, 0],
            dayEnd: [18, 0],
        };
        
        let now = new Date('2023-01-01T00:00:00Z');
        while (now.getDay() < 2)
        {
            const t = now.getTime();
            const exc = tExpected(t, chat);
            const result = chatStartEndDates(chat, t);

            if (result.disabled)
                throw new Error("This shouldn't happen");

            const isDayEnd = t < result.start || result.end <= t;

            expect(result.start).to.equal(exc.start);
            expect(result.end).to.equal(exc.end);
            expect(result.isDayEnd).to.equal(isDayEnd);

            now.setMinutes(now.getMinutes() + 15);
        }
    });

    it('should return false when dayStart & dayEnd are set to the same time', () =>
    {
        const chat = {
            timeZone: 'America/New_York',
            dayStart: [0, 0],
            dayEnd: [0, 0],
        };

        const now = new Date('2023-01-01T09:00:00Z').getTime();
        const exc = tExpected(now, chat);

        const result = chatStartEndDates(chat, now);

        expect(result.start).to.equal(null);
        expect(result.end).to.equal(null);
        expect(result.isDayEnd).to.equal(false);
    });
});
