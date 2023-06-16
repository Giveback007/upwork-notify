import { msToTime } from "./time.utils";

const map = {
    'Country': '[🌎]: ',
    'Skills': '[🎯]: ',
    'Budget': '[💰-BDG]: ',
    'Hourly Range': '[💸-HRL]: ',
    'Location Requirement': '[📍-Loc-Recq]: ',
}

export function generateMessage(feedItem: FeedItem, maxAgeDt: number = Infinity) {
    const { title, updated, linkHref, content, Category, ...ext } = feedItem;
    const { str } = ageOfPost(feedItem, maxAgeDt);

    // TODO:
    // `${type === 'updated' ? '[UPDATE]:' : ''}
    const message = `
------------------------
[${str} ago]:
[🏷️]: ${Category}
[🔍]: ${title}
[🔗]: ${linkHref}
${
    [
        'Country',
        'Skills',
        'Budget',
        'Hourly Range',
        'Location Requirement'
    ].reduce((acc, key) => {
        const val = (ext as any)[key];
        const name = (map as any)[key];
        if (val) acc += `\n${name} ${val}`;
        return acc;
}, '')}

[[ 📝 DETAILS ]]: 
${content}`;
// TODO:
// ${updated !== ext['Posted On'] ? `🔄 *Updated*: ${updated}` : ''}
    return message;
}

export function ageOfPost(item: FeedItem, maxAgeDt: number) {
    const now = Date.now();
    const t = new Date(item.updated).getTime();
    const ageMs = now - t;

    const {d, h, m} = msToTime(ageMs);

    let str;
    if (now > maxAgeDt) {
        str = `(Stopped updating) Older than ${h} hours`;
    } else {
        str = `${h}h ${m}m`;
    }

    return { d, h, m, str };
}
