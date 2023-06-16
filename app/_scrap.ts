import { UserState } from "./store/user-state.store";

const x = new UserState();
x.set('a', { username: 'a', isActive: true, roles: {} });

x.forEach((value, key, map) => {
    console.log(key, value)
});