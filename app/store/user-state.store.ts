import { MapState } from "./map-state.store";

export class UserState extends MapState<string, User>
{
    constructor(iterable?: Iterable<readonly [string, User]> | null | undefined)
    {
        if (iterable) iterable = Array.from(iterable).map(([key, value]) =>
            [(key[0] !== '@' ? '@' + key : key).toUpperCase(), value]);
        
        super(iterable);
    }

    private usrKey = (username: string) =>
        (username[0] !== '@' ? '@' + username : username).toUpperCase();

    override get = (username: string) => this._mapStateThis.get(this.usrKey(username));
    override has = (username: string) => this._mapStateThis.has(this.usrKey(username));

    override set = (username: string, user: User) => {
        this._mapStateThis.set(this.usrKey(username), user);
        return this;
    };

    override delete = (username: string) => this._mapStateThis.delete(this.usrKey(username));   
}