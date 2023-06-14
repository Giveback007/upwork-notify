import { Scheduler } from './bot/scheduler.bot';
import './init';
import sinon from 'sinon';

const clock = sinon.useFakeTimers({
    shouldAdvanceTime: true,
    advanceTimeDelta: 1,
});



// Create a fake clock
// const clock = sinon.useFakeTimers();
// clock.runAll();

// Function that advances the fake clock by 1 second every real-world second


// lets test the functionality of the scheduler
const scheduler = new Scheduler();

const queId = 'test1';
const start = Date.now();
let lastTime = Date.now();
const tasks = [...Array(60)].map((_, i) => scheduler.toQue(queId, async () => {
    const now = Date.now();
    // console.log(`TASK-${i+1}:`, ((now - lastTime) / 1000).toFixed(2) + 's');
    // console.log('TIME-SINCE-START:', ((now - start) / 1000).toFixed(2) + 's');
    lastTime = now;
    return now;
}));

Promise.all(tasks).then((v) => {
    const results = v.map(({v}) => v);
    console.log('DONE');
    console.log(results);
});