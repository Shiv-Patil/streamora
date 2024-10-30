import {
  VideoCameraIcon,
  UserCircleIcon,
  ArrowLeftIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";
import {
  NavigationMenu,
  NavigationMenuItem,
} from "@radix-ui/react-navigation-menu";
import { NavLink } from "./NavLink";
import { Separator } from "../ui/separator";

const DashboardSidenav = () => {
  return (
    <div className="relative w-64 p-4">
      <NavigationMenu className="sticky top-4 flex h-[calc(100vh-2rem)] w-full flex-col gap-4 rounded-xl bg-card p-2 shadow-xl backdrop-blur-lg">
        <span className="p-2 pb-6">Creator Dashboard</span>
        <Separator />
        <ul className="flex flex-1 flex-col gap-2">
          <NavigationMenuItem>
            <NavLink to="/dashboard/stream">
              <VideoCameraIcon className="h-6 w-6" />
              Stream
            </NavLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavLink to="/dashboard/profile">
              <UserCircleIcon className="h-6 w-6" />
              Profile
            </NavLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavLink to="/dashboard/credentials">
              <KeyIcon className="h-6 w-6" />
              Credentials
            </NavLink>
          </NavigationMenuItem>
          <div className="flex-1" />
          <NavigationMenuItem>
            <NavLink to="/">
              <ArrowLeftIcon className="h-6 w-6" />
              Go back
            </NavLink>
          </NavigationMenuItem>
        </ul>
      </NavigationMenu>
    </div>
  );
};

export default DashboardSidenav;
