const timeStr = '1:09am'
// Check for 24-hour time (no am/pm suffix)
const time24 = timeStr.match(/^([01]?[0-9]|2[0-3]):([0-5][0-9])$/);

// Check for 12-hour time (requires am/pm suffix)
const time12 = timeStr.match(/^(1[0-2]|0?[1-9]):([0-5][0-9])(am|pm)$/i);

// Use whichever match succeeded
console.log(time24 || time12);
