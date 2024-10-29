import type { LiveVideoPlayerProps } from "@/components/LiveVideoPlayer";
import api from "@/lib/axios-instance";
import { useQuery } from "@tanstack/react-query";

const fetchChannel = async (
  username?: string
): Promise<LiveVideoPlayerProps> => {
  const res = await api.get<LiveVideoPlayerProps>(
    `/channel?username=${username}`
  );
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
