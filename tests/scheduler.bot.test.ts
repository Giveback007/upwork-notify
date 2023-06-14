import { expect } from 'chai';
import { Scheduler } from '../app/bot/scheduler.bot';
import sinon from 'sinon';
import { wait } from '../app/utils/utils';

const log = console.log;

describe('Scheduler', function () {
    this.timeout(70000);

    const limits = {
        allItemsPerSec: 28,
        queItemsPerMin: 18,
        timingPerQue: 1_500,
    };

    let scheduler: Scheduler;
    let clock: sinon.SinonFakeTimers;
    let resolvedTasks = 0;

    beforeEach(() => {
        clock = sinon.useFakeTimers({
            shouldAdvanceTime: true,
            advanceTimeDelta: 1,
        });

        scheduler = new Scheduler(limits);
        resolvedTasks = 0;
    });

    afterEach(() => {
        clock.restore();
    });

    function task(queId: string) {
        return scheduler.toQue(queId, async () => {
            resolvedTasks++;
            return clock.Date.now();
        });
    }

    const sec = 1000;
    const min = 60 * sec;

    // Tests go here
    it(`should not allow more than 1 task per ("timingPerQue:" ${limits.timingPerQue}) per queId`, async () => {
        setInterval(() => clock.tick(11), 12);

        const queId = 'test1';
        const nOfItems = Math.max(Math.floor(limits.queItemsPerMin / 2), 3);
        const tasks = [...Array(nOfItems)].map(async () => await task(queId));
        const now = clock.Date.now();

        // Wait until all tasks are resolved
        while (resolvedTasks < tasks.length)
            await wait(0).then(() => clock.tick(20));

        const timings = await Promise.all(tasks);
        const timeValues = timings.filter((t) => t.ok).map((t) => t.out as number);

        timeValues.forEach((t, i) => {
            if (i === 0) return;

            const diff = t - timeValues[i - 1];
            log(`Item-${i + 1}:`, (diff / sec).toFixed(2) + 'sec');
            expect(diff).to.be.at.least(limits.timingPerQue);
        }); 
    });
    
    it(`should not allow more than ("queItemsPerMin": ${limits.queItemsPerMin}) tasks per minute per queId`, async () => {
        setInterval(() => clock.tick(100), 101);
        
        const queId = 'test1';
        const nOfItems = limits.queItemsPerMin * 2 + 1;
        const tasks = [...Array(nOfItems)].map(async () => await task(queId));

        // Wait until all tasks are resolved
        while (resolvedTasks < tasks.length)
            await wait(0).then(() => clock.tick(25));
    
        await Promise.all(tasks).then((timings) => {
            const timeValues = timings.filter((t) => t.ok).map((t) => t.out as number);
            // the time between the first and last task should be at least 2mins
            const diff = (timeValues[timeValues.length - 1] - timeValues[0]) / min;
            expect(diff).to.be.at.least(2);
            log('Time It Took:', diff.toFixed(2) + 'min');
        });
    });
    
    it(`should not allow more than ("allItemsPerSec": ${limits.allItemsPerSec}) tasks per second for all queIds`, async () => {
        setInterval(() => clock.tick(11), 12);
    
        // Create 3 time more (+5) than allItemsPerSec queues and push a task to each one
        const queueCount = limits.allItemsPerSec * 3 + 5;
        const tasks = [...Array(queueCount)].map(async (_, i) => await task('test-' + i));
        
        // Wait until all tasks are resolved
        while (resolvedTasks < tasks.length)
            await wait(0).then(() => clock.tick(25));
    
        // Fetch task completion times
        const timings = await Promise.all(tasks);
        const timeValues = timings.filter((t) => t.ok).map((t) => t.out as number);

        let secondStart = timeValues[0];
        let secondEnd = secondStart + sec;
        let secIdx = 0;
        const seconds: number[] = [0];
        timeValues.forEach((t, i) => {
            if (t >= secondEnd) {
                secIdx++;
                secondStart = secondEnd + 1;
                secondEnd = secondStart + sec;
                seconds[secIdx] = 0;
            }
            
            seconds[secIdx]++;
        });
        
        seconds.forEach((tasksCompleted, i) => {
            log(`Second-${i}:`, tasksCompleted);
            expect(tasksCompleted).to.be.at.most(limits.allItemsPerSec);
        });
    });
});
