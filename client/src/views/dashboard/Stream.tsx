import { Separator } from "@/components/ui/separator";
import UserAvatar from "@/components/UserAvatar";
import useProfile from "@/hooks/Profile";
import {
  ChatBubbleLeftEllipsisIcon,
  SignalIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";

function Stream() {
  const { data: userProfile } = useProfile();
  return (
    <div className="flex h-screen max-h-screen flex-1 flex-col gap-4 py-4 pr-4">
      <div className="flex max-h-16 min-h-16 w-full items-center justify-between gap-4 rounded-xl bg-card px-4 py-2 shadow-md">
        <div className="flex items-center gap-2">
          <UserAvatar profilePicture={userProfile?.profilePicture || ""} />
          {userProfile?.username || "User"}
        </div>
      </div>
      <div className="flex flex-1 gap-4">
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-1 flex-col gap-4 rounded-xl bg-card p-4 shadow-md">
            <span className="flex items-center gap-2 text-muted-foreground">
              <VideoCameraIcon className="h-6 w-6" /> Stream preview
            </span>
            <Separator />
            <div className="relative flex-1 overflow-clip">
              <img
                className="absolute h-full w-full object-cover"
                src={userProfile?.profileBanner || "/banner.png"}
              />
            </div>
          </div>
          <div className="flex max-h-56 min-h-56 flex-col gap-4 rounded-xl bg-card p-4 shadow-md">
            <span className="flex items-center gap-2 text-muted-foreground">
              <SignalIcon className="h-6 w-6" /> Session info
            </span>
            <Separator />
          </div>
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
