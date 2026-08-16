import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/common/Layout';
import { Toaster } from 'react-hot-toast';

// Lazy/Direct Imports of Master Pages
import { Login } from './pages/Login';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { ProductMaster } from './pages/ProductMaster';
import { DepotMaster } from './pages/DepotMaster';
import { SalesOfficeMaster } from './pages/SalesOfficeMaster';
import { UserMaster } from './pages/UserMaster';
import { PriceListMaster } from './pages/PriceListMaster';
import { SchemeListMaster } from './pages/SchemeListMaster';
import { LineSaleMaster } from './pages/LineSaleMaster';
import { DepotDashboard } from './pages/DepotDashboard';
import { SalesOfficerDashboard } from './pages/SalesOfficerDashboard';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

// Route Guard Component to handle auth redirects
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, isLoading } = useApp();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400 tracking-wider">Validating session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return <Layout>{children}</Layout>;
};

// Main Dashboard Router that resolves role-based portals on the root path `/`
const RoleDashboardResolver: React.FC = () => {
  const { currentUser } = useApp();
  
  if (!currentUser) return <Navigate to="/login" replace />;
  
  switch (currentUser.role) {
    case 'Super Admin':
      return <SuperAdminDashboard />;
    case 'Depot Person':
      return <DepotDashboard />;
    case 'Sales Officer':
      return <SalesOfficerDashboard />;
    default:
      return (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow">
          <p className="text-red-500 font-bold">Error: Identity role unrecognized.</p>
        </div>
      );
  }
};

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        {/* Toast Container */}
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 2500,
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: '600',
              borderRadius: '12px',
              padding: '12px 16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
            success: {
              duration: 2500,
              iconTheme: {
                primary: '#10b981',
                secondary: '#0f172a',
              },
            },
            error: {
              duration: 3500,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#0f172a',
              },
            },
          }}
        />
        
        <Routes>
          {/* Public login portal */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected enterprise console routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleDashboardResolver />
              </ProtectedRoute>
            }
          />
          
          {/* Products Catalog */}
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductMaster />
              </ProtectedRoute>
            }
          />
          
          {/* Depot/Warehouse master */}
          <Route
            path="/depots"
            element={
              <ProtectedRoute>
                <DepotMaster />
              </ProtectedRoute>
            }
          />
          
          {/* Sales Office Master / Stores list */}
          <Route
            path="/sales-offices"
            element={
              <ProtectedRoute>
                <SalesOfficeMaster />
              </ProtectedRoute>
            }
          />
          
          {/* User Master Registry */}
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <UserMaster />
              </ProtectedRoute>
            }
          />
          
          {/* Price Matrices */}
          <Route
            path="/price-list"
            element={
              <ProtectedRoute>
                <PriceListMaster />
              </ProtectedRoute>
            }
          />
          
          {/* Campaign Schemes */}
          <Route
            path="/scheme-list"
            element={
              <ProtectedRoute>
                <SchemeListMaster />
              </ProtectedRoute>
            }
          />

          {/* Super Admin Line Sale Master */}
          <Route
            path="/line-sale-master"
            element={
              <ProtectedRoute>
                <LineSaleMaster />
              </ProtectedRoute>
            }
          />

          {/* Fallbacks/Alias routes for Depot Personnel navigation clicks */}
          <Route
            path="/goods-issue"
            element={
              <ProtectedRoute>
                <DepotDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/goods-return"
            element={
              <ProtectedRoute>
                <DepotDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallbacks/Alias routes for Sales Officer navigation clicks */}
          <Route
            path="/sales-entry"
            element={
              <ProtectedRoute>
                <SalesOfficerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prices-schemes"
            element={
              <ProtectedRoute>
                <SchemeListMaster />
              </ProtectedRoute>
            }
          />
          
          {/* Analytical summary sheets */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          
          {/* Account profile & options */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          
          {/* Redirect all loose ends to standard workspace root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
