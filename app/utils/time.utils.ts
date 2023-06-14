export function toStrHhMm(time: [number, number])
{
    const hour = time[0].toString().padStart(2, '0');
    const minute = time[1].toString().padStart(2, '0');

    return hour + ':' + minute;
}

export function parseHhMm(timeStr: string): [number, number] | null
{
    // Check for 24-hour time (no am/pm suffix)
    const time24 = timeStr.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);

    // Check for 12-hour time (requires am/pm suffix)
    const time12 = timeStr.match(/^(1[0-2]|0?[1-9]):([0-5][0-9])(am|pm)$/i);

    // If the time is in 24-hour format
    if (time24) {
        const hours = parseInt(time24[1]!, 10);
        const minutes = parseInt(time24[2]!, 10);
        return [hours, minutes];
    }

    // If the time is in 12-hour format
    if (time12) {
        let hours = parseInt(time12[1]!, 10);
        const minutes = parseInt(time12[2]!, 10);
        if (time12[3]!.toLowerCase() === 'pm' && hours < 12) {
            hours += 12;
        }
        if (time12[3]!.toLowerCase() === 'am' && hours === 12) {
            hours = 0;
        }
        return [hours, minutes];
    }

    // If the time doesn't match either format, return null
    return null;
}

export function msToTime(msT: number)
{
    const ms = (msT % 1000);
    let s = Math.floor(msT / 1000);
    let m = Math.floor(s / 60);
    s = s % 60;

    let h = Math.floor(m / 60);
    m = m % 60;

    const d = Math.floor(h / 24);
    h = h % 24;

    return { d, h, m, s, ms };
}

export const getTime = (date: string | number | Date) => new Date(date).getTime();

export const time =
{
    sec: (s: number) => s * 1000,
    min: (m: number) => m * 60000,
    hrs: (h: number) => h * 3600000,
    day: (d: number) => d * 86400000,
}

export const wait = (ms: number) =>
    new Promise(r => setTimeout(r, ms));