import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "@/views/Home";
import NotFoundPage from "@/views/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/Auth";
import BrowseLayout from "@/layouts/Browse";
import { GOOGLE_CLIENT_ID } from "./lib/constants";
import DashboardLayout from "@/layouts/Dashboard";
import Stream from "@/views/dashboard/Stream";
import Profile from "@/views/dashboard/Profile";
import Channel from "@/views/Channel";
import Credentials from "@/views/dashboard/Credentials";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route
                  path="/dashboard/"
                  element={<Navigate to="/dashboard/stream" />}
                />
                <Route path="/dashboard/stream" element={<Stream />} />
                <Route path="/dashboard/profile" element={<Profile />} />
                <Route
                  path="/dashboard/credentials"
                  element={<Credentials />}
                />
                <Route path="/dashboard/*" element={<NotFoundPage />} />
              </Route>
              <Route path="/" element={<BrowseLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/:username" element={<Channel />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </GoogleOAuthProvider>
    </QueryClientProvider>
  );
};

export default App;
