import fetch from 'node-fetch';
import './init';
import { xmlToJSON } from "./utils/feed.utils";
import { readJSON, writeJSON } from './utils/utils';
import { hashString } from './utils/string.utils';
import { isType } from './utils/utils';

let url = "https://www.upwork.com/ab/feed/jobs/atom?api_params=1&contractor_tier=1%2C2&duration_v3=week&orgUid=1622242556971261953&paging=0%3B20&proposals=0-4&q=video%20editing&securityToken=d247917a634d198f50252bf18d7e2bbbc434c3ba31fa9008baf70e3e9611d3ae88288bd0cef7e90a2da58bb8313fb9f91a5d9975f2c082cb7724741024d1b800&sort=recency&userUid=1622242556971261952";


setTimeout(async () => {
    const hash = hashString(url, 'md5');
    const xmlPath = `../data/xml/feed.${hash}.xml`;
    const jsonPath = `../data/json/feed.${hash}.json`;

    // url = urlParamsFix(url, {
    //     sort: 'recency',
    //     paging: `0;100`,
    //     // paging: `0;100`,
    // });

    // const response = await fetch(url);
    // const xml = await response.text();
    // writeJSON(xmlPath, xml);

    const x = readJSON(xmlPath);
    if (!isType(x, 'string')) throw new Error('x is not a string');

    const item = await xmlToJSON(x)

    // if (!items) throw new Error('json is null');
    writeJSON(jsonPath, item);
    
    // let count = 0;
    // items.forEach(({ content }) => {
    //     // test if content has any of the test strings
    //     let testFailed = false;

    //     test.forEach((t) => content.includes(t) && (testFailed = true));
    //     if (testFailed) {
    //         count++;
    //         console.log(content);
    //     }
    // });
    // log('count:', count);
    // log('of   :', items.length);

    // const x = await xmlToJSON(xml);

    // const y = "Looking for hardworking, reliable UGC creators to help create content for a startup brow lamination kit brand here in Australia!\n\nThe kind of content l'm looking for:\n1. step-by-step tutorial video\n2. short UGC video (a before &amp; afters, talking kind of video)\n3. before &amp; after photos (close up, selfie)\n4. short transition video (reference video: https://vt.tiktok.com/ZS8obQ1DE/)\n5. results video (reference video: https://vt.tiktok.com/ZS8ogNTwq/)";
    // log(cleanUpContent(y));
    // log(x)
});