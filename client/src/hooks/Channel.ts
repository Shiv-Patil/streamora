import api from "@/lib/axios-instance";
import { useQuery } from "@tanstack/react-query";

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

export type Channel = BaseChannelType & (LiveChannel | notLiveChannel);

const fetchChannel = async (username?: string): Promise<Channel> => {
  const res = await api.get<Channel>(`/channel?username=${username}`);
  return res.data;
};

function useChannel(username?: string) {
  const queryResult = useQuery(
    ["channel", username],
    () => fetchChannel(username),
    {
      staleTime: 1000 * 60,
      retry: false,
      enabled: !!username,
    }
  );
  return queryResult;
}

export default useChannel;
