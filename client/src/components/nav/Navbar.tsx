import { NavigationMenu } from "@radix-ui/react-navigation-menu";
import { Link as RouterLink } from "react-router-dom";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/hooks/Auth";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import api from "@/lib/axios-instance";
import { isAxiosError } from "axios";
import { LOGIN_ENDPOINT } from "@/lib/constants";
import useProfile from "@/hooks/Profile";
import ImageWithFallback from "../ImageWithFallback";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeftStartOnRectangleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

const Navbar = () => {
  const { authState, updateAuthState, logOut } = useAuth();
  const { data: userProfile } = useProfile();

  const onSuccess = (credentialResponse: CredentialResponse) => {
    api
      .post<{ token: string }>(LOGIN_ENDPOINT, {
        token: credentialResponse.credential,
      })
      .then((response) => {
        updateAuthState(response.data.token);
        toast.success("Logged in successfully");
      })
      .catch((error) => {
        if (isAxiosError<{ message: string }>(error)) {
          toast.error(error.response?.data.message || "Login failed");
        } else {
          console.error(error);
          toast.error("Login failed");
        }
      });
  };

  return (
    <div className="sticky inset-x-0 top-0 z-50 flex h-16 w-full items-center gap-4 bg-background/50 px-4 py-2 backdrop-blur-lg transition-all">
      <RouterLink
        to="/"
        className="flex flex-1 flex-shrink-0 items-center gap-2 text-xl"
      >
        <img
          src={"/logo.png"}
          loading="lazy"
          decoding="async"
          className="h-10 object-contain"
          alt="logo"
        />
        <span className="max-sm:hidden">Streamora</span>
      </RouterLink>

      <NavigationMenu className="relative flex-1">
        <Input
          placeholder="Search"
          className="h-10 flex-shrink rounded-full bg-card px-4 pr-10 text-foreground placeholder:text-muted-foreground"
        />
        <Button
          className="absolute right-0 top-0 aspect-square h-full rounded-full bg-transparent p-2 text-primary-foreground hover:bg-background/20"
          variant="link"
        >
          <MagnifyingGlassIcon />
        </Button>
      </NavigationMenu>

      {!authState ? (
        <div className="flex flex-1 justify-end">
          <GoogleLogin
            onSuccess={onSuccess}
            onError={() => toast.error("Login failed")}
            text="continue_with"
            shape="pill"
            theme="filled_black"
          />
        </div>
      ) : (
        <nav className="flex flex-1 justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <ImageWithFallback
                src={userProfile?.profilePicture}
                className="cursor-pointer bg-card shadow-md"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="mr-4 w-56 border-2 bg-card shadow-2xl">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <RouterLink
                    to="/dashboard/profile"
                    className="flex w-full items-center gap-1"
                  >
                    <UserIcon className="h-6 w-6" />
                    Profile
                  </RouterLink>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <RouterLink
                    to="/dashboard"
                    className="flex w-full items-center gap-1"
                  >
                    <ComputerDesktopIcon className="h-6 w-6" />
                    Dashboard
                  </RouterLink>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-1"
                onClick={logOut}
              >
                <ArrowLeftStartOnRectangleIcon className="h-6 w-6" />
                <span className="flex-1">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      )}
    </div>
  );
};

export default Navbar;
