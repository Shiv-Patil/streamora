import DashboardSidenav from "@/components/nav/DashboardSidenav";
import { useAuth } from "@/hooks/Auth";
import { Navigate, Outlet } from "react-router-dom";

const DashboardLayout = () => {
  const { authState } = useAuth();
  return authState ? (
    <>
      <div className="flex">
        <DashboardSidenav />
        <Outlet />
      </div>
    </>
  ) : (
    <Navigate to="/" />
  );
};

export default DashboardLayout;
