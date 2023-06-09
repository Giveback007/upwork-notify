import { MapState } from "./map-state.store";
import { UserState } from "./user-state.store";

const stateVersion = 4;

export const stateParams = {
/** When the state structure changes this number will be changed */
    stateVersion,
    statePath: `../data/state-v${stateVersion}.json`
} as const;

export type AppState = {
    _v: typeof stateVersion;
    chats: MapState<string, Chat>;
    users: UserState;
    /** The hash id is generated with the feed Atom Link */
    feeds: MapState<string, Feed>;
    /** Msgs that the bot sent */
    jobMsgs: MapState<string, JobMsg>;
    feedItems: MapState<string, FeedItem>;
}
