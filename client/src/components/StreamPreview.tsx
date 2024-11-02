import { Channel } from "@/hooks/Channel";
import { Skeleton } from "./ui/skeleton";
import ImageWithFallback from "./ImageWithFallback";
import { getThumbnailUrl } from "@/lib/constants";
import defaultProfileBanner from "@/assets/banner.png";
import { Link } from "react-router-dom";

export const StreamPreview = (channel: Channel) => {
  if (!channel.isLive) return null;
  return (
    <Link to={channel.streamerUsername} className="flex flex-col gap-2">
      <div className="relative aspect-video">
        <ImageWithFallback
          src={getThumbnailUrl(channel.streamerUsername)}
          className="absolute h-full w-full rounded-none object-contain"
          defaultPic={channel.streamerProfileBanner ?? defaultProfileBanner}
          alt="thumbnail"
        />
      </div>
      <div className="flex items-start gap-2">
        <ImageWithFallback src={channel.streamerProfilePicture} />
        <div className="flex flex-col gap-1 overflow-hidden">
          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
            {channel.streamTitle}
          </span>
          <span className="text-ellipsis whitespace-nowrap text-sm text-muted-foreground">
            {channel.streamerUsername}
          </span>
          <span className="self-start text-ellipsis whitespace-nowrap text-nowrap rounded-full bg-muted px-2 py-[.125rem] text-xs text-muted-foreground">
            {channel.streamCategory}
          </span>
        </div>
      </div>
    </Link>
  );
};

export const StreamPreviewSkeleton = () => {
  return (
    <div className="flex flex-col gap-2 rounded-lg">
      <Skeleton className="aspect-video w-full" />
      <div className="flex items-start gap-2">
        <ImageWithFallback />
        <div className="flex flex-col items-start gap-1 overflow-hidden">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16 rounded-full px-2 py-[.125rem]" />
        </div>
      </div>
    </div>
  );
};
