import LiveVideoPlayer, {
  type LiveVideoPlayerProps,
} from "@/components/LiveVideoPlayer";
import api from "@/lib/axios-instance";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

const fetchChannel = async (
  username: string
): Promise<LiveVideoPlayerProps> => {
  const res = await api.get<LiveVideoPlayerProps>(
    `/channel?username=${username}`
  );
  return res.data;
};

function Channel() {
  const { username } = useParams();
  const queryResult = useQuery(
    [`channel:${username}`],
    () => fetchChannel(username!),
    {
      staleTime: 1000 * 60,
      retry: false,
      onSuccess(data) {
        console.log(data);
      },
    }
  );
  return (
    <div className="relative mx-4 mb-4 flex min-h-full flex-1 flex-col">
      {queryResult.isError ? (
        <div>ERROR</div>
      ) : (
        <LiveVideoPlayer {...queryResult.data} />
      )}
    </div>
  );
}

export default Channel;
