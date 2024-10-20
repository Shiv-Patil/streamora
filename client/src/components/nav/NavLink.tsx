import { NavigationMenuLink } from "@radix-ui/react-navigation-menu";
import { type LinkProps, useLocation } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";

export const NavLink = ({ to, ...props }: LinkProps) => {
  const { pathname } = useLocation();
  const isActive = pathname === (typeof to === "string" ? to : to.pathname);

  return (
    <NavigationMenuLink asChild active={isActive}>
      <RouterLink to={to} {...props} />
    </NavigationMenuLink>
  );
};
