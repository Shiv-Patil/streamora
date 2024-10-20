import Navbar from "@/components/nav/Navbar";
import Sidenav from "@/components/nav/Sidenav";
import { Outlet } from "react-router-dom";

const WithNavbar = () => {
  return (
    <>
      <Navbar />
      <div className="flex">
        <Sidenav />
        <Outlet />
      </div>
    </>
  );
};

export default WithNavbar;
