import Navbar from "@/components/nav/Navbar";
import BrowseSidenav from "@/components/nav/BrowseSidenav";
import { Outlet } from "react-router-dom";

const BrowseLayout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <BrowseSidenav />
        <Outlet />
      </div>
    </div>
  );
};

export default BrowseLayout;
