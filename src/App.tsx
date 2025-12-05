import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Transacoes from "./pages/Transacoes";
import Recuperacao from "./pages/Recuperacao";
import TypebotRanking from "./pages/TypebotRanking";
import GerarBoleto from "./pages/GerarBoleto";
import Configuracoes from "./pages/Configuracoes";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transacoes"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Transacoes />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/recuperacao"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Recuperacao />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/typebots"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <TypebotRanking />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/gerar-boleto"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <GerarBoleto />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/configuracoes"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Configuracoes />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
