import { expect } from 'chai';
import { cleanUpContent, parseContent } from '../app/utils/feed.utils';

describe('cleanUpContent', () => {
    it('should decode HTML entities', async () => {
        const testString = `&amp; &lt; &gt; &apos; &quot; &nbsp; &copy; &uuml; &Uuml; &ndash; &mdash; &iexcl; &iquest; &ldquo; &rdquo; &lsquo; &rsquo; &laquo; &raquo; &bull; &hellip; &permil; &prime; &Prime; &lsaquo; &rsaquo; &oline; &frasl; &euro; &trade; &larr; &uarr; &rarr; &darr; &harr; &crarr; &lceil; &rceil; &lfloor; &rfloor; &loz; &clubs; &hearts; &diams; &spades;`;
        const expectedString = `& < > ' "   © ü Ü – — ¡ ¿ “ ” ‘ ’ « » • … ‰ ′ ″ ‹ › ‾ ⁄ € ™ ← ↑ → ↓ ↔ ↵ ⌈ ⌉ ⌊ ⌋ ◊ ♣ ♥ ♦ ♠`;
        const cleanString = cleanUpContent(testString);

        expect(cleanString).to.equal(expectedString);
    });
});

describe('parseContent', () => {
    it('should parse content', async () => {
        const unparsedString = "Hi<br /><br />\nI have some wedding footage that i would like put together to make 5-15 second reels for use on social media. <br /><br />\nPlease chat if you are interested. <br /><br />\nThank you <br /><br /><b>Hourly Range</b>: $12.00-$16.00\n\n<br /><b>Posted On</b>: June 07, 2023 02:13 UTC<br /><b>Category</b>: Video Editing<br /><b>Skills</b>:Video Editing,     Adobe Premiere Pro,     Video Production,     Video Post-Editing,     Adobe After Effects    \n<br /><b>Country</b>: Australia\n<br /><a href=\"https://www.upwork.com/jobs/Video-Editor-Reels_%7E01c0e5c3c38bbff560?source=rss\">click to apply</a>";
        const expectedObj = {
            content: "Hi\n\nI have some wedding footage that i would like put together to make 5-15 second reels for use on social media. \n\nPlease chat if you are interested. \n\nThank you",
            extras: {
                "Posted On": "June 07, 2023 02:13 UTC",
                "Category": "Video Editing",
                "Country": "Australia",
                "Skills": "Video Editing, Adobe Premiere Pro, Video Production, Video Post-Editing, Adobe After Effects",
                "Hourly Range": "$12.00-$16.00"
            }
        }

        const parsedObj = parseContent(unparsedString);
        expect(parsedObj).to.deep.equal(expectedObj);
    });
});
