import StreamStartForm from "@/components/StartStreamForm";
import StreamOptions from "@/components/StreamOptions";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import ImageWithFallback from "@/components/ImageWithFallback";
import useChannel from "@/hooks/Channel";
import useProfile from "@/hooks/Profile";
import {
  ChatBubbleLeftEllipsisIcon,
  SignalIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";

function Stream() {
  const { data: userProfile } = useProfile();
  const { data: channel } = useChannel(userProfile?.username);

  return (
    <div className="flex h-screen max-h-screen flex-1 flex-col gap-4 py-4 pr-4">
      <div className="flex max-h-16 min-h-16 w-full items-center justify-between gap-4 rounded-xl bg-card px-4 py-2 shadow-md">
        <div className="flex items-center gap-2">
          <ImageWithFallback src={userProfile?.profilePicture} />
          {userProfile?.username || <Skeleton className="h-5 w-28" />}
        </div>
      </div>
      <div className="flex flex-1 gap-4">
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-1 flex-col gap-4 rounded-xl bg-card p-4 shadow-md">
            <span className="flex items-center gap-2 text-muted-foreground">
              <VideoCameraIcon className="h-6 w-6" /> Stream
            </span>
            <Separator />
            {channel?.isLive ? (
              <StreamOptions
                username={userProfile!.username}
                title={channel.streamTitle}
                category={channel.streamCategory}
                isConnected={!!channel.isConnected}
              />
            ) : (
              <StreamStartForm username={userProfile?.username} />
            )}
          </div>
          {channel?.isLive ? (
            <div className="flex max-h-72 min-h-72 flex-col gap-4 rounded-xl bg-card p-4 shadow-md">
              <span className="flex items-center gap-2 text-muted-foreground">
                <SignalIcon className="h-6 w-6" /> Session info
              </span>
              <Separator />
            </div>
          ) : null}
        </div>
        <div className="flex w-64 flex-col gap-4 rounded-xl bg-card p-4 shadow-md">
          <span className="flex items-center gap-2 text-muted-foreground">
            <ChatBubbleLeftEllipsisIcon className="h-6 w-6" /> Chat
          </span>
          <Separator />
        </div>
      </div>
    </div>
  );
}

export default Stream;
