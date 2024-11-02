export interface BaseChannelType {
    streamerUsername: string;
    streamerProfilePicture: string | null;
    streamerProfileBanner: string | null;
    streamerBio: string;
    streamerFollowers: number;
}

export interface LiveChannel {
    isLive: true;
    isConnected: boolean;
    streamTitle: string;
    streamCategory: string;
    streamStartedAt: number;
    viewerCount: number;
}

export interface notLiveChannel {
    isLive: false;
    lastStreamedAt: number | null;
}

export type ChannelType = BaseChannelType & (LiveChannel | notLiveChannel);

export interface Following {
    username: string;
    profilePicture: string | null;
    isLive: boolean;
}
export interface Profile {
    userId: string;
    username: string;
    email: string;
    profilePicture: string | null;
    profileBanner: string | null;
    bio: string;
    followerCount: number;
    following: Following[];
    streamCategories: string[];
    currentStreamId: number | null;
    streamKey: string;
}
