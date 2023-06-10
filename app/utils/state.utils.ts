import { EventEmitter } from 'events';
import { isType } from './test.utils';
import { wait } from './utils';

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

    // @ts-ignore
    on(event: string, listener: (val: T, oldVal?: T) => any) {
        // @ts-ignore
        super.on(event, listener);

        return {
            stop: () => {
                this.removeListener(event, listener);
            }
        };
    }
}

export class ObjState<T extends AnyObj> extends State<T> {
    update = (obj: Partial<T>) => {
        const state = this.get();
        const newState = { ...state, ...obj };
        
        this.set(newState);
    }
}

export class ArrState<T> extends State<T[]> {
    update = (val: T | T[]) => {
        const update = isType(val, 'array') ? val : [val];
        const state = this.get();
        const newState = [...state, ...update];

        this.set(newState);
    }
}

export class MapState<K extends string | number, V> extends State<Map<K, V>> {
    constructor(map: Map<K, V> = new Map()) {
        super(map);
    }

    getKey = (key: K) => {
        const state = super.get();
        return state.get(key);
    }
    
    update = (key: K, val: V) => {
        const state = this.get();
        state.set(key, val);

        this.set(state);
    }
}