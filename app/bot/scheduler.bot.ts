import { wait } from "../utils/time.utils";

type QuePromise<T> = {
    promise: Promise<{ ok: true; out: T; } | { ok: false; out: any }>;
    resolve: (value: { ok: true; out: T; } | { ok: false; out: any }) => any;
};

export class Scheduler {
    private que: Map<string, ((value?: any) => Promise<any>)[]> = new Map();
    constructor(private limits = {
        /** How many msgs can be sent per second for all que items */
        allItemsPerSec: 28,
        /** Per given que how many msgs can be sent per minute */
        queItemsPerMin: 18,
        /** Per given que how often you can send a msg */
        timingPerQue: 1_500,
    }) {}

    toQue = <T>(queId: string, task: () => Promise<T>) =>
    {
        let que = this.que.get(queId);
        if (!que) {
            que = [];
            this.que.set(queId, que);
        };

        const { promise, resolve } = this.createQuePromise<T>();

        que.push(() => task()
            .then((out) => resolve({ ok: true, out }))
            .catch((out) => {
                log(`\n[Task failed with] ${out}`);
                if (env.isDev) debugger;

                resolve({ ok: false, out: out || 'Task failed' });
            })
        );

        wait(0).then(() => this.startRateLimiter(queId));
        return promise;
    }

    getTimings = (queId: string) =>
    ({
        queTimings: this.queTimings[queId],
        perSecTimings: this.perSecTimings,
    })

    private createQuePromise = <T>(): QuePromise<T> =>
    {
        let resolve: QuePromise<T>['resolve'];
        const promise = new Promise((res) => {
            resolve = res;
        }) as QuePromise<T>['promise'];
    
        return { promise, resolve: resolve! };
    }

    private queSending: { [queId: string]: boolean } = { };
    private queTimings: { [queId: string]: number[] } = { };
    private queActual: { [queId: string]: number[] } = { };
    private perSecTimings = [0];
    private perSecActual = [0];
    private startRateLimiter = async (queId: string): Promise<any> =>
    {
        const again = (t = 250) => wait(t).then(() => this.startRateLimiter(queId));

        const sec = 1_000;
        const min = 60_000;
        const now = Date.now();
        const lastTiming = this.queTimings[queId]?.[this.queTimings[queId]!.length - 1] || 0;
        const tSinceLast = now - lastTiming;

        const isSending = this.queSending[queId];
        const que = this.que.get(queId);
        
        if (!que || !que.length || isSending) return;

        if (tSinceLast < this.limits.timingPerQue)
            return again(this.limits.timingPerQue - tSinceLast);

        this.perSecTimings = this.perSecTimings.filter(n => n > now - sec);
        if (this.perSecTimings.length >= this.limits.allItemsPerSec)
            return again(sec - (now - this.perSecTimings[0]!));

        this.perSecActual = this.perSecActual.filter(n => n > now - sec);
        if (this.perSecActual.length >= this.limits.allItemsPerSec)
            return again(sec - (now - this.perSecActual[0]!));
                
        this.queTimings[queId] = (this.queTimings[queId] || []).filter(n => n > now - min);
        if (this.queTimings[queId]!.length >= this.limits.queItemsPerMin)
            return again(min - (now - this.perSecTimings[0]!));

        this.queActual[queId] = (this.queActual[queId] || []).filter(n => n > now - min);
        if (this.queActual[queId]!.length >= this.limits.queItemsPerMin)
            return again(min - (now - this.perSecActual[0]!));

        // Execute the next que item and wait for it to complete.
        const task = que.shift()!;
        this.queSending[queId] = true;

        this.perSecTimings.push(now);
        this.queTimings[queId]!.push(now);

        task().finally(() => {
            const nowActual = Date.now();
            this.queSending[queId] = false;
            this.perSecActual.push(nowActual);
            this.queActual[queId] = (this.queActual[queId] || []);
            this.queActual[queId]!.push(nowActual);

            // If there are more items in the que, wait and try again
            if (que.length) again();
        });
    }
}
