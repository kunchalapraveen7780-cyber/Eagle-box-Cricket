import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import PremiumLoader from "./components/PremiumLoader";
import LandingPage from "./pages/LandingPage";
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SlotBookingFlow from "./pages/SlotBookingFlow";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VenuesPage from "./pages/VenuesPage";
import VenueDetailsPage from "./pages/VenueDetailsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import MembershipSuccess from "./pages/MembershipSuccess";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Toaster position="top-right" />
      <AnimatePresence mode="wait">
        {isLoading ? (
          <PremiumLoader key="loader" />
        ) : (
          <motion.div
            key="app-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Router>
              <div className="min-h-screen flex flex-col">
                <main className="flex-grow">
                  <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/venues" element={<VenuesPage />} />
              <Route path="/venues/:id" element={<VenueDetailsPage />} />
              <Route path="/login/customer" element={<Login />} />
              <Route path="/login/admin" element={<Login />} />
              <Route path="/register/customer" element={<Register />} />
              <Route path="/customer/book" element={<SlotBookingFlow />} />
              
              {/* Protected Routes */}
              <Route path="/customer/dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
              <Route path="/customer/bookings" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
              <Route path="/customer/rewards" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
              <Route path="/customer/profile" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
              <Route path="/customer/membership/success" element={<ProtectedRoute><MembershipSuccess /></ProtectedRoute>} />
              
              <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="ADMIN"><AdminDashboard /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </Router>
          </motion.div>
        )}
      </AnimatePresence>
    </GoogleOAuthProvider>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center font-sans text-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-6xl font-extrabold text-[#22C55E] mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-6">Oops! The page you are looking for does not exist or has been moved.</p>
        <Link
          to="/"
          className="bg-[#22C55E] hover:bg-green-600 text-white font-bold px-6 py-2.5 rounded-lg transition-colors inline-block"
        >
          Go Back Home
        </Link>
      </div>
    </div>
  );
}

export default App;
