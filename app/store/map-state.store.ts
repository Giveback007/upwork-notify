import { EventEmitter } from 'events';

type MapStateActions<K extends string | number, V> =
    | SetAction<K, V>
    | DeleteAction<K, V>
    | ClearAction
    | UpdateAction<K, V>;

type SetAction<K extends string | number, V> = {
    _t: 'set';
    key: K;
    oldVal: V | undefined;
    newVal: V;
};

type DeleteAction<K extends string | number, V> = {
    _t: 'delete';
    key: K;
    oldVal: V | undefined;
};

type ClearAction = {
    _t: 'clear';
};

type UpdateAction<K extends string | number, V> = {
    _t: 'update';
    map: MapState<K, V>;
};

export class MapState<K extends string | number, V> extends EventEmitter {

    private map: Map<K, V>

    get size(): number {
        return this.map.size;
    }

    constructor(
        iterable?: Iterable<readonly [K, V]> | null | undefined
    ) {
        super();
        this.map = new Map<K, V>(iterable);
    }

    // Accessor Methods
    get = (key: K): V | undefined => this.map.get(key);
    has = (key: K): boolean => this.map.has(key);

    // Mutator Methods
    set = (key: K, val: V): this => {
        const oldValue = this.map.get(key);
        this.map.set(key, val);
        this.scheduleEmitter({ _t: 'set', key, oldVal: oldValue, newVal: val });
        return this;
    }

    clear = (): void => {
        this.map.clear();
        this.scheduleEmitter({ _t: 'clear' });
    }

    delete = (key: K): boolean => {
        const oldValue = this.map.get(key);
        const result = this.map.delete(key);
        if (result) {
            this.scheduleEmitter({ _t: 'delete', key, oldVal: oldValue });
        }
        return result;
    }

    // Iteration Method
    forEach = (callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void => {
        this.map.forEach(callbackfn, thisArg);
    }

    // Key & Value Methods
    keys = (): IterableIterator<K> => this.map.keys();
    values = (): IterableIterator<V> => this.map.values();
    entries = (): IterableIterator<[K, V]> => this.map.entries();

    // Iteration Method for 'for...of' loops
    [Symbol.iterator] = (): IterableIterator<[K, V]> => this.map[Symbol.iterator]();

    // Conversion Methods
    toEntryArr = () => Array.from(this.map);

    // @ts-ignore
    override on = (event: "change", listener: (changeHistory: MapStateActions<K, V>[]) => void) => {
        if (event !== "change")
            log(new Error(`Unsupported event type: ${event}`));
        else
            // @ts-ignore
            super.on(event, listener);

        return {
            stop: () => {
                this.removeListener(event, listener);
            }
        };
    }

    update = (fct: (map: Map<K, V>) => Map<K, V>) => {
        const newMap = fct(this.map);
        this.map = newMap;
        this.scheduleEmitter({ _t: 'update', map: this });
        return this;
    }

    private changeTimeout: NodeJS.Timeout | null = null;
    private changeHistory: MapStateActions<K, V>[] = [];
    private scheduleEmitter(change: MapStateActions<K, V>) {
        this.changeHistory.push(change);
        if (this.changeTimeout)
            clearTimeout(this.changeTimeout);
            
        this.changeTimeout = setTimeout(() => {
            if (this.changeHistory.length)
                this.emit('change', this.changeHistory);
        
            this.changeHistory = [];
            this.changeTimeout = null;
        }, 0);
    }
}
