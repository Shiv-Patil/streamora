export interface BaseChannelType {
    streamerUsername: string;
    streamerProfilePicture: string | null;
    streamerProfileBanner: string | null;
    streamerBio: string;
    streamerFollowers: integer;
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
}

export type ChannelType = BaseChannelType & (LiveChannel | notLiveChannel);
