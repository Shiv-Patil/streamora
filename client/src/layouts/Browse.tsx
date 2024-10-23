import Navbar from "@/components/nav/Navbar";
import BrowseSidenav from "@/components/nav/BrowseSidenav";
import { Outlet } from "react-router-dom";

const BrowseLayout = () => {
  return (
    <>
      <Navbar />
      <div className="flex">
        <BrowseSidenav />
        <Outlet />
      </div>
    </>
  );
};

export default BrowseLayout;
