import { NavigationMenu } from "@radix-ui/react-navigation-menu";
import { Link as RouterLink } from "react-router-dom";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/hooks/Auth";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import api from "@/lib/axios-instance";
import { isAxiosError } from "axios";
import { LOGIN_ENDPOINT } from "@/lib/constants";
import useProfile from "@/hooks/Profile";
import UserAvatar from "../UserAvatar";

const Navbar = () => {
  const { authState, updateAuthState } = useAuth();
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
    <div className="sticky inset-x-0 top-0 z-50 flex h-16 w-full items-center justify-between gap-4 bg-background/50 px-4 py-2 backdrop-blur-lg transition-all">
      <RouterLink
        to="/"
        className="flex flex-shrink-0 items-center gap-2 text-xl"
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

      <NavigationMenu className="relative">
        <Input
          placeholder="Search"
          className="h-10 flex-shrink rounded-full border-none bg-primary px-4 pr-10 text-primary-foreground placeholder:text-muted"
        />
        <Button
          className="absolute right-0 top-0 aspect-square h-full rounded-full bg-transparent p-2 text-primary-foreground hover:bg-background/20"
          variant="link"
        >
          <MagnifyingGlassIcon />
        </Button>
      </NavigationMenu>

      {!authState ? (
        <GoogleLogin
          onSuccess={onSuccess}
          onError={() => toast.error("Login failed")}
          text="continue_with"
          shape="pill"
          theme="filled_black"
        />
      ) : (
        <RouterLink to="/dashboard">
          <UserAvatar
            profilePicture={userProfile?.profilePicture || ""}
            className="cursor-pointer bg-card/50 shadow-md"
          />
        </RouterLink>
      )}
    </div>
  );
};

export default Navbar;
