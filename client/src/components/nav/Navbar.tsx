import { NavigationMenu } from "@radix-ui/react-navigation-menu";
import { Link as RouterLink } from "react-router-dom";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";
import { useAuth } from "@/lib/Auth";
import axios from "axios";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";

const Navbar = () => {
  const { authState, updateAuthState } = useAuth();

  const onSuccess = async (credentialResponse: CredentialResponse) => {
    axios
      .post("http://localhost:9000/api/login", {
        token: credentialResponse.credential,
      })
      .then((response) => {
        updateAuthState(response.data.token);
        toast.success("Logged in successfully");
      })
      .catch((error) => {
        if (axios.isAxiosError(error)) {
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
      ) : null}
    </div>
  );
};

export default Navbar;
