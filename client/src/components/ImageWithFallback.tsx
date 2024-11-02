import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { cn } from "@/lib/utils";
import defaultProfilePicture from "@/assets/default_profilePicture.webp";
import { Skeleton } from "./ui/skeleton";

const ImageWithFallback = ({
  src,
  className,
  defaultPic = defaultProfilePicture,
  alt = "avatar",
}: {
  src?: string | null;
  className?: string;
  defaultPic?: string;
  alt?: string;
}) => {
  return src !== undefined ? (
    <Avatar className={cn("min-h-11 min-w-11 overflow-clip", className)}>
      <AvatarImage src={src ?? defaultPic} alt={alt} />
      <AvatarFallback className="bg-transparent">
        <img src={defaultPic} className="h-full w-full object-cover" />
      </AvatarFallback>
    </Avatar>
  ) : (
    <Skeleton className={cn("min-h-11 min-w-11 rounded-full", className)} />
  );
};

export default ImageWithFallback;
