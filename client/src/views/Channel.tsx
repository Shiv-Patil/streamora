import LiveVideoPlayer from "@/components/LiveVideoPlayer";
import useChannel from "@/hooks/Channel";
import { useParams } from "react-router-dom";
import NotFoundPage from "./NotFound";

function Channel() {
  const { username } = useParams();
  const queryResult = useChannel(username);
  return queryResult.error ? (
    <NotFoundPage />
  ) : (
    <div className="relative mx-4 mb-4 flex min-h-full flex-1 flex-col">
      <LiveVideoPlayer {...queryResult.data} />
    </div>
  );
}

export default Channel;
