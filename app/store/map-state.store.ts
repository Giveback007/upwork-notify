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

    protected _mapStateThis;
    private map: Map<K, V>

    get size(): number {
        return this.map.size;
    }

    constructor(
        iterable?: Iterable<readonly [K, V]> | null | undefined
    ) {
        super();
        this._mapStateThis = { ...this as MapState<K, V> };

        this.map = new Map<K, V>(iterable);
    }

    // Accessor Methods
    get = (key: K): V | undefined => this.map.get(key);
    has = (key: K): boolean => this.map.has(key);
    getVals = (keys: K[]): V[] => keys
        .map((key) => this.map.get(key))
        .filter((val) => val !== undefined) as V[];

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

    find = (predicate: (value: V, key: K, map: Map<K, V>) => boolean): V | undefined => {
        // bcs performance :)
        let found: V | undefined = undefined;
        try {
            this.map.forEach((value, key, map) => {
                if (predicate(value, key, map)) {
                    found = value;
                    throw 'found';
                }
            });
        } catch {
            return found;
        }

        return found;
    }

    findAll = (predicate: (value: V, key: K, map: Map<K, V>) => boolean): V[] => {
        const found: V[] = [];
        this.map.forEach((value, key, map) => {
            if (predicate(value, key, map)) found.push(value);
        });

        return found;
    }

    // Key & Value Methods
    keys = (): IterableIterator<K> => this.map.keys();
    values = (): IterableIterator<V> => this.map.values();
    entries = (): IterableIterator<[K, V]> => this.map.entries();

    // Conversion Method
    entriesArr = (): [K, V][] => Array.from(this.map);

    // Iteration Method for 'for...of' loops
    [Symbol.iterator] = (): IterableIterator<[K, V]> => this.map[Symbol.iterator]();

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
