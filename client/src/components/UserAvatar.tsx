import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";
import defaultProfilePicture from "@/assets/default_profilePicture.webp";

const UserAvatar = ({
  profilePicture,
  className,
}: {
  profilePicture?: string | null;
  className?: string;
}) => {
  return (
    <Avatar className={cn("h-11 w-11 overflow-clip", className)}>
      <AvatarImage src={profilePicture || ""} />
      <AvatarFallback className="bg-transparent">
        <img
          src={defaultProfilePicture}
          className="h-full w-full object-cover"
        />
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
