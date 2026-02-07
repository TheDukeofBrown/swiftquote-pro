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
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import QuoteBuilder from "./pages/QuoteBuilder";
import QuotesList from "./pages/QuotesList";
import QuoteDetail from "./pages/QuoteDetail";
import QuoteSent from "./pages/QuoteSent";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import QuoteView from "./pages/QuoteView";
import PlumbersLanding from "./pages/PlumbersLanding";
import ElectriciansLanding from "./pages/ElectriciansLanding";
import NotFound from "./pages/NotFound";

// Admin pages
import AdminOverview from "./pages/admin/AdminOverview";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminCompanyDetail from "./pages/admin/AdminCompanyDetail";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminQuotes from "./pages/admin/AdminQuotes";
import AdminQuoteDetail from "./pages/admin/AdminQuoteDetail";
import AdminAudit from "./pages/admin/AdminAudit";

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
                  <Route path="/plumbers" element={<PlumbersLanding />} />
                  <Route path="/electricians" element={<ElectriciansLanding />} />
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
                    path="/quotes/:id/sent"
                    element={
                      <ProtectedRoute requireCompany>
                        <QuoteSent />
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
                  <Route
                    path="/billing"
                    element={
                      <ProtectedRoute requireCompany>
                        <Billing />
                      </ProtectedRoute>
                    }
                  />
                  {/* Public quote view - no auth required */}
                  <Route path="/q/:quoteId" element={<QuoteView />} />
                  
                  {/* Admin routes */}
                  <Route
                    path="/admin"
                    element={
                      <AdminProtectedRoute>
                        <AdminOverview />
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/companies"
                    element={
                      <AdminProtectedRoute>
                        <AdminCompanies />
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/companies/:id"
                    element={
                      <AdminProtectedRoute>
                        <AdminCompanyDetail />
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <AdminProtectedRoute>
                        <AdminUsers />
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/quotes"
                    element={
                      <AdminProtectedRoute>
                        <AdminQuotes />
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/quotes/:id"
                    element={
                      <AdminProtectedRoute>
                        <AdminQuoteDetail />
                      </AdminProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/audit"
                    element={
                      <AdminProtectedRoute>
                        <AdminAudit />
                      </AdminProtectedRoute>
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
