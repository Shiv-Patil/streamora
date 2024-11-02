import { VideoCameraIcon } from "@heroicons/react/24/outline";
import { Separator } from "../ui/separator";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@radix-ui/react-navigation-menu";
import { NavLink } from "./NavLink";
import { useAuth } from "@/hooks/Auth";
import useProfile, { Following } from "@/hooks/Profile";
import ImageWithFallback from "../ImageWithFallback";
import { Link } from "react-router-dom";

const FollowingListItem = ({
  following: { username, profilePicture, isLive },
}: {
  following: Following;
}) => {
  return (
    <Link to={username} className="flex items-center gap-2">
      <ImageWithFallback src={profilePicture} />
      <div className="flex flex-col">
        {username}
        {isLive ? (
          <span className="flex gap-1 text-sm text-muted-foreground">live</span>
        ) : null}
      </div>
    </Link>
  );
};

const BrowseSidenav = () => {
  const { data: userProfile } = useProfile();
  const { authState } = useAuth();

  return (
    <div className="relative w-64 p-4 pr-0 pt-0 max-lg:hidden">
      <NavigationMenu className="sticky top-16 flex h-[calc(100vh-5rem)] w-full flex-col gap-2 rounded-xl bg-card p-2 shadow-xl backdrop-blur-lg">
        <NavigationMenuList className="gap-2">
          <NavigationMenuItem>
            <NavLink to="/">
              <VideoCameraIcon className="h-6 w-6" />
              Browse
            </NavLink>
          </NavigationMenuItem>
        </NavigationMenuList>
        <Separator />
        <NavigationMenuList>
          <div className="flex max-h-[calc(100vh-9rem)] flex-col gap-2 overflow-y-scroll text-sm">
            <span>Following</span>
            {!authState ? (
              <span className="text-muted-foreground">
                Sign in to follow streamers!
              </span>
            ) : !userProfile || !userProfile.following.length ? (
              "You are not following any channel yet."
            ) : (
              userProfile.following.map((following, key) => (
                <FollowingListItem following={following} key={key} />
              ))
            )}
          </div>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
};

export default BrowseSidenav;
