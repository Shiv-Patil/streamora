import { UserIcon } from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";

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
      <AvatarFallback className="p-[6px]">
        <UserIcon />
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
