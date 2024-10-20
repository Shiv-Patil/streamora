import { VideoCameraIcon } from "@heroicons/react/24/outline";
import { Separator } from "../ui/separator";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@radix-ui/react-navigation-menu";
import { NavLink } from "./NavLink";
import { useState } from "react";

const Sidenav = () => {
  const [following, _setFollowing] = useState([]);

  return (
    <div className="relative w-64 p-4 pt-0 max-lg:hidden">
      <NavigationMenu className="sticky top-16 flex h-[calc(100vh-5rem)] w-full flex-col gap-2 rounded-xl bg-card/50 p-2 shadow-xl backdrop-blur-lg">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavLink
              className="flex cursor-pointer items-center gap-4 rounded-md p-2 hover:bg-card/80 data-[active]:bg-card/60"
              to="/"
            >
              <VideoCameraIcon className="h-6 w-6" />
              Browse
            </NavLink>
          </NavigationMenuItem>
        </NavigationMenuList>
        <Separator />
        <NavigationMenuList>
          <div className="flex flex-col gap-1 text-sm">
            <span>Following</span>
            {!following.length ? (
              <span className="text-muted-foreground">
                You are not following any channel yet.
              </span>
            ) : null}
          </div>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
};

export default Sidenav;
