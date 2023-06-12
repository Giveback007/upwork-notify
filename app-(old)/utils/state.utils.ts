import { EventEmitter } from 'events';
import { wait } from './utils';

// -- // State // -- //
export class State <T> extends EventEmitter {
    private _value: T;

    constructor(val: T) {
        super();
        this._value = val;
    }

    set(val: T) {
        const oldVal = this._value;
        this._value = val;
        // Prevents infinite loops
        wait(0).then(() => this.emit('change', this._value, oldVal));

        return val;
    }

    get = () => this._value;

    update = (fn: (val: T) => T) => this.set(fn(this._value));

    // @ts-ignore
    override on(event: string, listener: (val: T, oldVal?: T) => any) {
        // @ts-ignore
        super.on(event, listener);

        return {
            stop: () => {
                this.removeListener(event, listener);
            }
        };
    }
}

// -- // MapState // -- //
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
        this.scheduleChange({ _t: 'set', key, oldVal: oldValue, newVal: val });
        return this;
    }

    clear = (): void => {
        this.map.clear();
        this.scheduleChange({ _t: 'clear' });
    }

    delete = (key: K): boolean => {
        const oldValue = this.map.get(key);
        const result = this.map.delete(key);
        if (result) {
            this.scheduleChange({ _t: 'delete', key, oldVal: oldValue });
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
    toJSON = () => JSON.stringify(Array.from(this.map));

    static fromJSON = <K extends string | number, V>(json: string) => {
        const arr = JSON.parse(json) as [K, V][];
        const map = new Map<K, V>(arr);

        return new MapState<K, V>(map);
    }

    // @ts-ignore
    on = (event: string, listener: (change: MapStateActions<K, V>) => void) => {
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
        this.scheduleChange({ _t: 'update', map: this });
        return this;
    }

    private changeTimeout: NodeJS.Timeout | null = null;
    private lastChange: MapStateActions<K, V> | null = null;
    private scheduleChange(change: MapStateActions<K, V>) {
        this.lastChange = change;
        if (this.changeTimeout)
            clearTimeout(this.changeTimeout);
            
        this.changeTimeout = setTimeout(() => {
            if (this.lastChange) {
                this.emit('change', this.lastChange);
            }
            this.changeTimeout = null;
            this.lastChange = null;
        }, 0);
    }
}
