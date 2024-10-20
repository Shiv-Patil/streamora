import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "@/views/Home";
import NotFoundPage from "@/views/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/Auth";
import WithNavbar from "./layouts/WithNavbar";
import { GOOGLE_CLIENT_ID } from "./lib/constants";

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/settings" element={<Home />} />
              <Route path="/" element={<WithNavbar />}>
                <Route path="/" element={<Home />} />
                <Route path="/:user" element={<Home />} />
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
