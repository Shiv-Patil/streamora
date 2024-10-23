import DashboardSidenav from "@/components/nav/DashboardSidenav";
import { Outlet } from "react-router-dom";

const DashboardLayout = () => {
  return (
    <>
      <div className="flex">
        <DashboardSidenav />
        <Outlet />
      </div>
    </>
  );
};

export default DashboardLayout;
