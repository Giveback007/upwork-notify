import { ageOfPost } from "./utils";

const map = {
    'Country': '[🌎]: ',
    'Skills': '[🎯]: ',
    'Budget': '[💰-BDG]: ',
    'Hourly Range': '[💸-HRL]: ',
    'Location Requirement': '[📍-Loc-Recq]: ',
}

export function generateMessage(feedItem: FeedItem) {
    const { id, title, updated, linkHref, content, Category, ...ext } = feedItem;
    const { h, m } = ageOfPost(feedItem);

    // `${type === 'updated' ? '[UPDATE]:' : ''}
    const message = `[⏱️ ${h}h ${m}m ago]:
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
//! TODO:
// ${updated !== ext['Posted On'] ? `🔄 *Updated*: ${updated}` : ''}
    return message;
}
