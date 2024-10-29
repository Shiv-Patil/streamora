import LiveVideoPlayer from "@/components/LiveVideoPlayer";
import useChannel from "@/hooks/Channel";
import { useParams } from "react-router-dom";

function Channel() {
  const { username } = useParams();
  const queryResult = useChannel(username);
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
