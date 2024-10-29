import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";
import defaultProfilePicture from "@/assets/default_profilePicture.webp";
import { Skeleton } from "./ui/skeleton";

const UserAvatar = ({
  profilePicture,
  className,
}: {
  profilePicture?: string | null;
  className?: string;
}) => {
  return profilePicture ? (
    <Avatar className={cn("h-11 w-11 overflow-clip", className)}>
      <AvatarImage src={profilePicture} />
      <AvatarFallback className="bg-transparent">
        <img
          src={defaultProfilePicture}
          className="h-full w-full object-cover"
        />
      </AvatarFallback>
    </Avatar>
  ) : (
    <Skeleton className={cn("h-11 w-11 rounded-full", className)} />
  );
};

export default UserAvatar;
