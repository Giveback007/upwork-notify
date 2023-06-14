import { expect } from 'chai';
import { parseContent } from '../app/feed';

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
