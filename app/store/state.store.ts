import { EventEmitter } from 'events';

export class State<T> extends EventEmitter {
    private _value: T;
    private changeTimeout: NodeJS.Timeout | null = null;

    constructor(val: T) {
        super();
        this._value = val;
    }

    set(val: T) {
        this._value = val;
        this.scheduleEmitter(val);
        return val;
    }

    get = () => this._value;

    update = (fn: (val: T) => T) => this.set(fn(this._value));

    // @ts-ignore
    override on(event: "change", listener: (val: T) => any) {
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

    private scheduleEmitter(newVal: T) {
        if (this.changeTimeout)
            clearTimeout(this.changeTimeout);

        this.changeTimeout = setTimeout(() => {
            this.emit('change', newVal);
            
            this.changeTimeout = null;
        }, 0);
    }
}
