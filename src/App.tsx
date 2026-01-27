import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { BrandProvider } from "@/contexts/BrandContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import QuoteBuilder from "./pages/QuoteBuilder";
import QuotesList from "./pages/QuotesList";
import QuoteDetail from "./pages/QuoteDetail";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CompanyProvider>
            <BrandProvider>
              <SubscriptionProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute>
                        <Onboarding />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute requireCompany>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/quotes"
                    element={
                      <ProtectedRoute requireCompany>
                        <QuotesList />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/quotes/new"
                    element={
                      <ProtectedRoute requireCompany>
                        <QuoteBuilder />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/quotes/:id"
                    element={
                      <ProtectedRoute requireCompany>
                        <QuoteDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/quotes/:id/edit"
                    element={
                      <ProtectedRoute requireCompany>
                        <QuoteBuilder />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute requireCompany>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SubscriptionProvider>
            </BrandProvider>
          </CompanyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
