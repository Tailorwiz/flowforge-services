import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import LoginSelect from "./pages/LoginSelect";
import CustomerAuth from "./pages/CustomerAuth";
import AdminAuth from "./pages/AdminAuth";
import ClientDashboard from "./pages/ClientDashboard";
import ClientPortal from "./pages/ClientPortal";
import IntakeForm from "./pages/IntakeForm";
import SMSOptInPolicy from "./pages/SMSOptInPolicy";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/sms-policy" element={<SMSOptInPolicy />} />
          <Route path="/login" element={<LoginSelect />} />
          <Route path="/customer/login" element={<CustomerAuth />} />
          <Route path="/admin/login" element={<AdminAuth />} />
          
          {/* Protected routes */}
          <Route path="/*" element={
            <AuthProvider>
              <Routes>
                <Route path="/" element={<ClientPortal />} />
                <Route path="/admin" element={<Index />} />
                
                <Route path="/auth" element={<Auth />} />
                <Route path="/client/:clientId" element={<ClientDashboard />} />
                <Route path="/portal" element={<ClientPortal />} />
                <Route path="/intake-form" element={<IntakeForm />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
