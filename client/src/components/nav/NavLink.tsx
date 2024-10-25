import { cn } from "@/lib/utils";
import { NavigationMenuLink } from "@radix-ui/react-navigation-menu";
import { type LinkProps, useLocation } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";

export const NavLink = ({ to, className, ...props }: LinkProps) => {
  const { pathname } = useLocation();
  const isActive = pathname === (typeof to === "string" ? to : to.pathname);

  return (
    <NavigationMenuLink asChild active={isActive}>
      <RouterLink
        draggable={false}
        to={to}
        className={cn(
          "flex cursor-pointer items-center gap-4 rounded-md bg-primary p-2 hover:brightness-125 data-[active]:pointer-events-none data-[active]:bg-muted",
          className
        )}
        {...props}
      />
    </NavigationMenuLink>
  );
};
