import { EventEmitter } from 'events';

export class State <T> extends EventEmitter {
    private _value: T;

    constructor(val: T) {
        super();
        this._value = val;
    }

    set(val: T) {
        this._value = val;
        this.emit('change', this._value);

        return val;
    }

    get = () => this._value;

    on(event: string, listener: (val: T) => any) {
        // @ts-ignore
        super.on(event, listener);

        return {
            stop: () => {
                this.removeListener(event, listener);
            }
        };
    }
}
