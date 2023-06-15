import { MapState } from "./map-state.store";

export class UserState extends MapState<string, User>
{
    constructor(iterable?: Iterable<readonly [string, User]> | null | undefined)
    {
        super();

        if (iterable)
            Array.from(iterable).forEach(([key, value]) =>
                super.set(this.usrKey(key), value));
    }

    private usrKey = (username: string) =>
        (username[0] !== '@' ? '@' + username : username).toUpperCase();

    override get = (username: string) => super.get(this.usrKey(username));
    override has = (username: string) => super.has(this.usrKey(username));

    override set = (username: string, user: User) => super.set(this.usrKey(username), user);
    override delete = (username: string) => super.delete(this.usrKey(username));   
}